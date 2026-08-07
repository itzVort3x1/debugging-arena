/**
 * Verify the Postgres challenge store loads every challenge byte-identically to
 * the local filesystem — the safety net for the cutover to
 * `ARENA_CHALLENGE_SOURCE=postgres`.
 *
 * Two modes:
 *
 *   npx tsx --env-file=.env scripts/verify-postgres-parity.ts
 *     Live. Checks the real `Challenge` table. Run after
 *     `import-challenges-to-db.ts`; this is the one that gates the cutover.
 *
 *   npx tsx scripts/verify-postgres-parity.ts --offline
 *     No database. Builds the rows in memory from `challenges/` and runs
 *     PostgresStore against them, exercising the tree/list/index logic exactly
 *     as the live store would. Catches store bugs; cannot catch a bad import.
 *
 * Both compare, per challenge and per language, the full ChallengeDefinition
 * produced through `loader.ts` from each store, plus the synthesized
 * `index.json` against the filesystem manifest. Exits non-zero on any mismatch.
 */
import { FilesystemStore } from "../src/lib/challenges/store/filesystem";
import {
  PostgresStore,
  type ChallengeRow,
  type ChallengeRowSource,
} from "../src/lib/challenges/store/postgres";
import { listChallengeRoots, loadChallenge } from "../src/lib/challenges/loader";
import {
  MANIFEST_PATH,
  buildManifest,
  parseManifest,
} from "../src/lib/challenges/manifest";
import { buildAllRows } from "./challenge-rows";

const offline = process.argv.includes("--offline");

/**
 * Recursively sort object keys so two JSON values can be compared by meaning
 * rather than by key order.
 *
 * Needed only for the index: `loadChallengeSummary` builds its meta by
 * spreading the parsed `meta.json` (`{...meta, runtime, languages,
 * defaultLanguage}`), so the key order it emits follows whatever order the
 * author wrote that file in. The Postgres store synthesizes meta from columns
 * and cannot reproduce that. Values, key sets, and array order are all still
 * compared exactly — only key ordering, which JSON does not treat as
 * meaningful, is normalized away.
 */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonical(v)]),
    );
  }
  return value;
}

/** An in-memory row source, so the store can be checked without a database. */
function memoryRowSource(rows: ChallengeRow[]): ChallengeRowSource {
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return {
    findPublished: async (slug) => bySlug.get(slug) ?? null,
    listPublished: async () => rows,
  };
}

async function main() {
  const fsStore = new FilesystemStore();

  let pgStore: PostgresStore;
  if (offline) {
    pgStore = new PostgresStore(memoryRowSource(await buildAllRows()));
  } else {
    pgStore = new PostgresStore();
  }

  const roots = await listChallengeRoots(fsStore);
  if (roots.length === 0) throw new Error("No challenges found under challenges/");
  let allOk = true;

  // ----- 1. The synthesized index vs the filesystem manifest -----
  // `version` is a generation timestamp and always differs; the entries are
  // what the registry actually builds its index from.
  const expectedIndex = (await buildManifest(fsStore)).challenges;
  const indexRaw = await pgStore.readText(MANIFEST_PATH);
  if (indexRaw === undefined) {
    console.error("MISMATCH index.json: postgres store returned nothing");
    allOk = false;
  } else {
    const actualIndex = parseManifest(indexRaw).challenges;
    if (
      JSON.stringify(canonical(actualIndex)) !==
      JSON.stringify(canonical(expectedIndex))
    ) {
      console.error("MISMATCH index.json");
      console.error("  filesystem:", JSON.stringify(canonical(expectedIndex)));
      console.error("  postgres:  ", JSON.stringify(canonical(actualIndex)));
      allOk = false;
    } else {
      console.log(`  ok  index.json (${actualIndex.length} challenges)`);
    }
  }

  // ----- 2. Every challenge x language, fully loaded -----
  for (const root of roots) {
    // Flat layout on both sides: the challenge root is its slug.
    const entry = expectedIndex.find((c) => c.path === root);
    if (!entry) {
      console.error(`MISMATCH ${root}: missing from the filesystem manifest`);
      allOk = false;
      continue;
    }

    for (const lang of entry.languages) {
      const [fsDef, pgDef] = await Promise.all([
        loadChallenge(fsStore, root, lang),
        loadChallenge(pgStore, root, lang).catch((err: Error) => err),
      ]);

      if (pgDef instanceof Error) {
        console.error(`MISMATCH ${root} [${lang}]: postgres load failed:`, pgDef.message);
        allOk = false;
        continue;
      }

      if (JSON.stringify(fsDef) !== JSON.stringify(pgDef)) {
        console.error(`MISMATCH ${root} [${lang}]`);
        allOk = false;
      } else {
        console.log(
          `  ok  ${root} [${lang}] ` +
            `(${pgDef.files.length} files, ${pgDef.testFiles.length} tests, ` +
            `${pgDef.hints.length} hints)`,
        );
      }
    }
  }

  // ----- 3. An unknown slug must resolve to "missing", not throw -----
  if ((await pgStore.readText("no-such-challenge/meta.json")) !== undefined) {
    console.error("MISMATCH: unknown slug returned content");
    allOk = false;
  }
  if ((await pgStore.list("no-such-challenge")).length !== 0) {
    console.error("MISMATCH: unknown slug listed non-empty");
    allOk = false;
  }

  if (!allOk) {
    console.error(
      `\nParity FAILED${offline ? " (offline)" : ""}. Do not switch ` +
        "ARENA_CHALLENGE_SOURCE to postgres.",
    );
    process.exitCode = 1;
    return;
  }
  console.log(`\nParity OK${offline ? " (offline)" : ""}.`);
}

main()
  .catch((err) => {
    console.error("Parity check failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (!offline) {
      const { prisma } = await import("../src/lib/prisma");
      await prisma.$disconnect();
    }
  });
