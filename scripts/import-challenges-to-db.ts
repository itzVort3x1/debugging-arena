/**
 * Load a challenge file tree into the `Challenge` table.
 *
 * This began as the one-time migration off repo-as-source-of-truth. Now that
 * `challenges/` has left git, it is the restore half of a pair:
 * `export-challenges-from-db.ts` writes the database out as a tree, and this
 * reads one back in. Together they are what makes the database not a
 * single-copy dead end.
 *
 * Takes the directory to import, since there is no longer a canonical tree in
 * the repo to default to:
 *   npx tsx --env-file=.env scripts/import-challenges-to-db.ts challenges-export
 *
 * Idempotent: a challenge whose file tree already matches the row is skipped
 * without bumping its version. Anything else is written as a new version, with
 * a `ChallengeVersion` snapshot recorded. Challenges are imported as PUBLISHED,
 * so re-importing an export that contained drafts publishes them — check the
 * status column in the export's challenges.json first if that matters.
 *
 * It never deletes: a challenge absent from the tree stays in the database.
 * Unpublish it from the admin UI (or delete the row by hand).
 */
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import { buildAllRows } from "./challenge-rows";
import { asTree, type ChallengeTree } from "../src/lib/challenges/store/tree";

/**
 * Serialize a tree with its keys sorted, for comparison only.
 *
 * The comparison has to be order-insensitive because `jsonb` does not preserve
 * key order — it stores keys sorted by length, then bytewise — while a tree
 * read off disk arrives in readdir order. Comparing the two serializations
 * directly therefore reports "changed" on every run even when nothing has,
 * bumping the version and recording a duplicate snapshot each time. The values
 * are compared as themselves; only the key order is normalized.
 */
function canonical(tree: ChallengeTree): string {
  const sorted: ChallengeTree = {};
  for (const key of Object.keys(tree).sort()) sorted[key] = tree[key];
  return JSON.stringify(sorted);
}

async function main() {
  const arg = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!arg) {
    throw new Error(
      "Usage: import-challenges-to-db.ts <dir>  (e.g. challenges-export, " +
        "produced by export-challenges-from-db.ts)",
    );
  }
  const dir = path.resolve(arg);

  const rows = await buildAllRows(dir);
  if (rows.length === 0) {
    throw new Error(`No challenge directories found under ${dir}`);
  }

  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const row of rows) {
    const { slug, content, ...meta } = row;
    const tree = content as Record<string, string>;

    const outcome = await prisma.$transaction(async (tx) => {
      const existing = await tx.challenge.findUnique({ where: { slug } });

      // Skip a re-import that would change nothing, so versions only advance on
      // real edits.
      if (existing && canonical(asTree(existing.content)) === canonical(tree)) {
        return "unchanged" as const;
      }

      const version = existing ? existing.version + 1 : 1;
      const now = new Date();

      await tx.challenge.upsert({
        where: { slug },
        create: {
          slug,
          ...meta,
          content: tree,
          status: "PUBLISHED",
          version,
          publishedAt: now,
        },
        update: {
          ...meta,
          content: tree,
          status: "PUBLISHED",
          version,
          publishedAt: existing?.publishedAt ?? now,
        },
      });

      await tx.challengeVersion.create({
        data: {
          challengeSlug: slug,
          version,
          content: tree,
          meta,
          note: existing
            ? "Re-imported from challenges/"
            : "Imported from challenges/",
        },
      });

      return existing ? ("updated" as const) : ("created" as const);
    });

    if (outcome === "created") created++;
    else if (outcome === "updated") updated++;
    else unchanged++;

    const fileCount = Object.keys(tree).length;
    console.log(
      `  ${outcome.padEnd(9)} ${slug} ` +
        `(${fileCount} files, ${row.languages.join(", ")})`,
    );
  }

  console.log(
    `Imported ${rows.length} challenge(s): ${created} created, ` +
      `${updated} updated, ${unchanged} unchanged.`,
  );
}

main()
  .catch((err) => {
    // Message only: a usage error should read as usage, not as a stack trace.
    console.error(`\nImport failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
