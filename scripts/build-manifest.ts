/**
 * Generate the challenge manifest (`challenges/index.json`) from the local
 * `challenges/` tree. The manifest lets the registry warm its meta tier from a
 * single read instead of listing + reading every meta.json — the win is on a
 * remote store, but generating it locally lets us exercise that path. The same
 * builder backs `verify-postgres-parity.ts`, which compares this manifest
 * against the one PostgresStore synthesizes.
 *
 * Run from the repo root:
 *   npx tsx scripts/build-manifest.ts
 *
 * The output is a build artifact (gitignored). Regenerate it whenever a
 * challenge's meta/layout changes.
 */
import path from "node:path";
import { writeFile } from "node:fs/promises";
import { FilesystemStore } from "../src/lib/challenges/store/filesystem";
import {
  MANIFEST_PATH,
  buildManifest,
  serializeManifest,
} from "../src/lib/challenges/manifest";

async function main() {
  const store = new FilesystemStore();
  const manifest = await buildManifest(store);
  const outPath = path.join(process.cwd(), "challenges", MANIFEST_PATH);
  await writeFile(outPath, serializeManifest(manifest), "utf-8");
  console.log(
    `Wrote manifest with ${manifest.challenges.length} challenge(s) to ${outPath}`,
  );
}

main().catch((err) => {
  console.error("Failed to build manifest:", err);
  process.exit(1);
});
