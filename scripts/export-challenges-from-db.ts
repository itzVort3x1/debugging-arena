/**
 * Export the `Challenge` table back to a file tree - the inverse of
 * `import-challenges-to-db.ts`, and the reason dropping `challenges/` from git
 * is not a one-way door.
 *
 * Once the repo tree is gone, the database is the only copy of current
 * challenge content: git history still holds the snapshot as of the deletion
 * commit, but nothing authored or edited in the admin UI afterwards exists
 * anywhere else. This script is how that content gets back out - to commit a
 * periodic snapshot, to diff what the admin UI has changed, or to rebuild the
 * tree after a database loss.
 *
 * Run from the repo root with the database env set:
 *   npx tsx --env-file=.env scripts/export-challenges-from-db.ts [outDir]
 *
 * Defaults to `challenges-export/`. Writes `<outDir>/<slug>/<path>` for every
 * entry in each row's `content` map, plus `<outDir>/challenges.json` holding
 * the meta columns - the projection is derived from meta.json, so the tree
 * alone is sufficient to rebuild, but having the columns makes a diff against
 * a suspected drift trivial.
 *
 * Exports DRAFT rows too (marked in the summary). A backup that silently
 * omitted unpublished work would be exactly the wrong kind of surprise.
 *
 * Refuses to write into a non-empty directory unless --force is passed, so it
 * can never half-overwrite an existing tree.
 */
import path from "node:path";
import { mkdir, writeFile, readdir } from "node:fs/promises";
import { prisma } from "../src/lib/prisma";

/** Reject paths that would escape the challenge root (defence against bad rows). */
function safeJoin(root: string, rel: string): string {
    const target = path.resolve(root, rel);
    const bounded = path.resolve(root) + path.sep;
    if (!target.startsWith(bounded)) {
        throw new Error(`Refusing to write outside the export root: ${rel}`);
    }
    return target;
}

async function isNonEmptyDir(dir: string): Promise<boolean> {
    try {
        return (await readdir(dir)).length > 0;
    } catch {
        return false; // missing dir is fine
    }
}

async function main() {
    const args = process.argv.slice(2);
    const force = args.includes("--force");
    const outDir = path.resolve(
        args.find((a) => !a.startsWith("--")) ?? "challenges-export",
    );

    if (!force && (await isNonEmptyDir(outDir))) {
        throw new Error(
            `${outDir} is not empty. Pass --force to overwrite, or pick another directory.`,
        );
    }

    const challenges = await prisma.challenge.findMany({
        orderBy: { slug: "asc" },
    });
    if (challenges.length === 0) {
        throw new Error("No challenges in the database - nothing to export.");
    }

    const summary: Array<Record<string, unknown>> = [];
    let fileCount = 0;

    for (const c of challenges) {
        const tree = c.content as Record<string, string>;
        const paths = Object.keys(tree).sort();
        for (const rel of paths) {
            const target = safeJoin(path.join(outDir, c.slug), rel);
            await mkdir(path.dirname(target), { recursive: true });
            // Written raw: the import read these with utf-8 and no transformation, so
            // an unmodified round-trip must be byte-identical.
            await writeFile(target, tree[rel], "utf-8");
            fileCount++;
        }
        summary.push({
            slug: c.slug,
            title: c.title,
            difficulty: c.difficulty,
            tags: c.tags,
            timeLimit: c.timeLimit,
            stack: c.stack,
            issueContext: c.issueContext,
            languages: c.languages,
            defaultLanguage: c.defaultLanguage,
            status: c.status,
            version: c.version,
            files: paths.length,
        });
        const draft = c.status === "PUBLISHED" ? "" : `  [${c.status}]`;
        console.log(
            `  ok  ${c.slug} v${c.version} (${paths.length} files)${draft}`,
        );
    }

    await mkdir(outDir, { recursive: true });
    await writeFile(
        path.join(outDir, "challenges.json"),
        JSON.stringify(
            { exportedAt: new Date().toISOString(), challenges: summary },
            null,
            2,
        ) + "\n",
        "utf-8",
    );

    const drafts = summary.filter((s) => s.status !== "PUBLISHED").length;
    console.log(
        `\nExported ${challenges.length} challenges (${fileCount} files) to ${outDir}` +
            (drafts > 0 ? ` - ${drafts} not published` : ""),
    );
}

main()
    .catch((err) => {
        console.error(`\nExport failed: ${err.message}`);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
