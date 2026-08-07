import { prisma } from "../../prisma";
import {
  MANIFEST_PATH,
  serializeManifest,
  type ChallengeManifest,
} from "../manifest";
import type { ChallengeMeta, Runtime } from "../../../../challenges/_schema";
import type { ChallengeEntry, ChallengeStore } from "./types";
import { asTree, childrenOf, splitPath, type ChallengeTree } from "./tree";

/**
 * A {@link ChallengeStore} backed by the `Challenge` table, where each row holds
 * a challenge's raw file tree as jsonb. Postgres is the source of truth once
 * `ARENA_CHALLENGE_SOURCE=postgres` (see POSTGRES_CHALLENGES_PLAN.md).
 *
 * The tree is stored raw — `{ "meta.json": "…", "files/src/x.ts": "…" }`, paths
 * relative to the challenge root — rather than as a parsed ChallengeDefinition,
 * so `loader.ts` stays the single authority on how a tree becomes a challenge.
 * This store's whole job is to make a jsonb map look like a directory tree.
 *
 * Layout is flat: a challenge's store-relative root is its slug. Difficulty
 * folders were a bucket-layout concern; here difficulty is a column.
 *
 * Two things worth knowing:
 *
 *   - **Only published challenges are visible.** Drafts never reach the app;
 *     the admin UI reads them through Prisma directly.
 *   - **`index.json` is synthesized, not stored.** Reading it runs one query
 *     over the meta columns and serializes a manifest on the fly, so the
 *     registry warms its entire meta tier from a single round-trip and the
 *     index can never drift from the rows it describes.
 */

/** The columns this store reads. Mirrors the `Challenge` meta projection. */
export interface ChallengeRow {
  slug: string;
  title: string;
  difficulty: string;
  tags: string[];
  timeLimit: number;
  stack: string[];
  issueContext: string;
  languages: string[];
  defaultLanguage: string;
  content: unknown;
}

/**
 * The narrow data dependency the store has on the database. Prisma satisfies it
 * in production; tests and the parity script pass an in-memory implementation,
 * which is what lets the tree/index logic be verified without a live database.
 */
export interface ChallengeRowSource {
  /** One published challenge by slug, or null when absent/unpublished. */
  findPublished(slug: string): Promise<ChallengeRow | null>;
  /** Every published challenge, ordered by slug. */
  listPublished(): Promise<ChallengeRow[]>;
}

const SELECT_COLUMNS = {
  slug: true,
  title: true,
  difficulty: true,
  tags: true,
  timeLimit: true,
  stack: true,
  issueContext: true,
  languages: true,
  defaultLanguage: true,
  content: true,
} as const;

/** The production row source: the `Challenge` table, published rows only. */
export function prismaRowSource(): ChallengeRowSource {
  return {
    findPublished: (slug) =>
      prisma.challenge.findFirst({
        where: { slug, status: "PUBLISHED" },
        select: SELECT_COLUMNS,
      }),
    listPublished: () =>
      prisma.challenge.findMany({
        where: { status: "PUBLISHED" },
        select: SELECT_COLUMNS,
        orderBy: { slug: "asc" },
      }),
  };
}

/**
 * The resolved `ChallengeMeta` for a row. Every field of the summary meta the
 * registry needs is a column, so this needs no parse of `meta.json`: `runtime`
 * is the resolved default language, exactly as `loadChallengeSummary` returns
 * it. The import path writes these columns from that same function, and
 * `verify-postgres-parity.ts` checks the two agree.
 */
function metaOf(row: ChallengeRow): ChallengeMeta {
  return {
    slug: row.slug,
    title: row.title,
    difficulty: row.difficulty as ChallengeMeta["difficulty"],
    tags: row.tags,
    timeLimit: row.timeLimit,
    stack: row.stack,
    issueContext: row.issueContext,
    runtime: row.defaultLanguage as Runtime,
    languages: row.languages as Runtime[],
    defaultLanguage: row.defaultLanguage as Runtime,
  };
}

export class PostgresStore implements ChallengeStore {
  readonly kind = "postgres" as const;

  private readonly source: ChallengeRowSource;

  /** Rows memoized for the process; cleared by {@link invalidate}. */
  private rows = new Map<string, Promise<ChallengeRow | null>>();
  private all: Promise<ChallengeRow[]> | null = null;

  constructor(source: ChallengeRowSource = prismaRowSource()) {
    this.source = source;
  }

  private fetchRow(slug: string): Promise<ChallengeRow | null> {
    let row = this.rows.get(slug);
    if (!row) {
      row = this.source.findPublished(slug).catch((err) => {
        this.rows.delete(slug); // allow a retry rather than caching the failure
        throw err;
      });
      this.rows.set(slug, row);
    }
    return row;
  }

  private fetchAll(): Promise<ChallengeRow[]> {
    if (!this.all) {
      this.all = this.source.listPublished().catch((err) => {
        this.all = null;
        throw err;
      });
    }
    return this.all;
  }

  private async treeOf(slug: string): Promise<ChallengeTree | undefined> {
    const row = await this.fetchRow(slug);
    return row ? asTree(row.content) : undefined;
  }

  /** The registry index, computed from the meta columns in one query. */
  private async buildIndexJson(): Promise<string> {
    const rows = await this.fetchAll();
    const manifest: ChallengeManifest = {
      version: new Date().toISOString(),
      challenges: rows.map((row) => ({
        // Flat layout: a challenge's root path is its slug.
        path: row.slug,
        slug: row.slug,
        languages: row.languages as Runtime[],
        defaultLanguage: row.defaultLanguage as Runtime,
        meta: metaOf(row),
      })),
    };
    return serializeManifest(manifest);
  }

  async readText(rel: string): Promise<string | undefined> {
    if (rel === MANIFEST_PATH) return this.buildIndexJson();

    const { slug, rest } = splitPath(rel);
    if (!slug || !rest) return undefined; // the root and a bare slug are dirs
    const tree = await this.treeOf(slug);
    return tree?.[rest];
  }

  async list(rel: string): Promise<ChallengeEntry[]> {
    const { slug, rest } = splitPath(rel);

    // The store root lists every published challenge as a directory.
    if (!slug) {
      const rows = await this.fetchAll();
      return rows.map((row) => ({ name: row.slug, isDir: true }));
    }

    const tree = await this.treeOf(slug);
    if (!tree) return []; // missing challenge lists as empty, like a missing dir
    return childrenOf(tree, rest);
  }

  invalidate(): void {
    this.rows.clear();
    this.all = null;
  }
}
