/**
 * Turn a challenge file tree on disk into `Challenge` rows, for
 * `import-challenges-to-db.ts`.
 *
 * Reads the tree with plain `fs` and wraps it in a `MemoryStore` rather than
 * going through a filesystem-backed `ChallengeStore`. That keeps the import
 * path alive now that Postgres is the only store the app itself knows about,
 * and it costs nothing: `MemoryStore` and `PostgresStore` derive their
 * directory structure from the same helpers in `store/tree`, so a tree that
 * imports cleanly is one that will serve cleanly.
 *
 * Deliberately free of any Prisma import, so it can be used with no DATABASE_URL.
 */
import path from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { MemoryStore } from "../src/lib/challenges/store/memory";
import { loadChallengeSummary } from "../src/lib/challenges/loader";
import type { ChallengeStore } from "../src/lib/challenges/store/types";
import type { ChallengeTree } from "../src/lib/challenges/store/tree";
import type { ChallengeRow } from "../src/lib/challenges/store/postgres";

/**
 * Read every file under `dir` into a root-relative forward-slash tree. Mirrors
 * the layout rule the loader expects; separators are normalized so an import
 * run on Windows produces the same keys as one on Linux.
 */
export async function readTreeFromDisk(dir: string): Promise<ChallengeTree> {
  const tree: ChallengeTree = {};
  const stack: string[] = [""];
  while (stack.length) {
    const rel = stack.pop()!;
    const entries = await readdir(path.join(dir, rel), {
      withFileTypes: true,
    });
    for (const entry of entries) {
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        stack.push(childRel);
        continue;
      }
      tree[childRel] = await readFile(path.join(dir, childRel), "utf-8");
    }
  }
  return tree;
}

/**
 * The challenge directories under `dir`. `_`/`.` prefixes are skipped, matching
 * `listChallengeRoots`, so a tree can carry sibling files (an export's
 * `challenges.json`, a stray `_schema.ts`) without them being read as
 * challenges.
 */
export async function listChallengeDirs(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter(
      (e) =>
        e.isDirectory() &&
        !e.name.startsWith("_") &&
        !e.name.startsWith("."),
    )
    .map((e) => e.name)
    .sort();
}

/** Recursively read every file under `root` into a path -> content map. */
export async function collectTree(
  store: ChallengeStore,
  root: string,
): Promise<Record<string, string>> {
  const tree: Record<string, string> = {};
  const stack: string[] = [""]; // sub-paths relative to root
  while (stack.length) {
    const rel = stack.pop()!;
    const dir = [root, rel].filter(Boolean).join("/");
    for (const entry of await store.list(dir)) {
      const childRel = [rel, entry.name].filter(Boolean).join("/");
      if (entry.isDir) {
        stack.push(childRel);
        continue;
      }
      const content = await store.readText(`${root}/${childRel}`);
      if (content !== undefined) tree[childRel] = content;
    }
  }
  return tree;
}

/**
 * Build the row for one challenge: its raw file tree plus the meta projection.
 * The projection comes from `loadChallengeSummary`, the same function the
 * registry uses, so the columns hold exactly the resolved meta the app expects.
 */
export async function buildChallengeRow(
  store: ChallengeStore,
  root: string,
): Promise<ChallengeRow> {
  const summary = await loadChallengeSummary(store, root);
  const { meta } = summary;
  return {
    slug: summary.slug,
    title: meta.title,
    difficulty: meta.difficulty,
    tags: meta.tags,
    timeLimit: meta.timeLimit,
    stack: meta.stack,
    issueContext: meta.issueContext,
    languages: summary.languages,
    defaultLanguage: summary.defaultLanguage,
    content: await collectTree(store, root),
  };
}

/** Every challenge under `dir` as a row, ordered by slug. */
export async function buildAllRows(dir: string): Promise<ChallengeRow[]> {
  const names = await listChallengeDirs(dir);
  const trees: Record<string, ChallengeTree> = {};
  for (const name of names) {
    trees[name] = await readTreeFromDisk(path.join(dir, name));
  }
  const store = new MemoryStore(trees);
  const rows = await Promise.all(names.map((n) => buildChallengeRow(store, n)));
  rows.sort((a, b) => a.slug.localeCompare(b.slug));
  return rows;
}
