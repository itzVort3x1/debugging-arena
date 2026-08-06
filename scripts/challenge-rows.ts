/**
 * Turn a challenge store's tree into `Challenge` rows. Shared by
 * `import-challenges-to-db.ts` (which writes them) and
 * `verify-postgres-parity.ts` (which builds them in memory to check the
 * Postgres store without a live database).
 *
 * Deliberately free of any Prisma import, so it can be used with no DATABASE_URL.
 */
import { FilesystemStore } from "../src/lib/challenges/store/filesystem";
import {
  listChallengeRoots,
  loadChallengeSummary,
} from "../src/lib/challenges/loader";
import type { ChallengeStore } from "../src/lib/challenges/store/types";
import type { ChallengeRow } from "../src/lib/challenges/store/postgres";

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

/** Every challenge in `store` as a row, ordered by slug. */
export async function buildAllRows(
  store: ChallengeStore = new FilesystemStore(),
): Promise<ChallengeRow[]> {
  const roots = await listChallengeRoots(store);
  const rows = await Promise.all(roots.map((r) => buildChallengeRow(store, r)));
  rows.sort((a, b) => a.slug.localeCompare(b.slug));
  return rows;
}
