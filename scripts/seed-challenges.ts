/**
 * Seed the Supabase Storage `challenges` bucket from the local `challenges/`
 * tree. Each challenge is uploaded under its difficulty folder
 * (`<difficulty>/<slug>/…`, difficulty taken from meta.json — the single source
 * of truth), then the manifest (`index.json`) is written at the bucket root.
 *
 * Run from the repo root with the server env set:
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npx tsx scripts/seed-challenges.ts
 *
 * Idempotent: re-running upserts every object. (It does not delete objects for
 * files removed from a challenge — clear the bucket if you need a clean slate.)
 */
import fs from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdmin, challengeBucket } from "../src/lib/supabase";
import { FilesystemStore } from "../src/lib/challenges/store/filesystem";
import {
  MANIFEST_PATH,
  buildManifest,
  serializeManifest,
} from "../src/lib/challenges/manifest";
import type { ChallengeMeta } from "../challenges/_schema";

const CONTENT_TYPE: Record<string, string> = {
  ".json": "application/json",
  ".md": "text/markdown",
  ".ts": "text/plain",
  ".tsx": "text/plain",
  ".js": "text/plain",
  ".py": "text/plain",
  ".go": "text/plain",
  ".rs": "text/plain",
};

function contentTypeFor(rel: string): string {
  return CONTENT_TYPE[path.extname(rel).toLowerCase()] ?? "text/plain";
}

/** Recursively collect file paths under `root`, relative + forward-slashed. */
async function walk(root: string, rel = ""): Promise<string[]> {
  const entries = await fs.readdir(path.join(root, rel), {
    withFileTypes: true,
  });
  const out: string[] = [];
  for (const e of entries) {
    const childRel = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...(await walk(root, childRel)));
    else out.push(childRel);
  }
  return out;
}

async function main() {
  const supabase = getSupabaseAdmin();
  const bucket = challengeBucket();

  // Ensure a private bucket exists.
  const { data: buckets, error: listErr } =
    await supabase.storage.listBuckets();
  if (listErr) throw new Error(`listBuckets: ${listErr.message}`);
  if (!buckets?.some((b) => b.name === bucket)) {
    const { error } = await supabase.storage.createBucket(bucket, {
      public: false,
    });
    if (error) throw new Error(`createBucket "${bucket}": ${error.message}`);
    console.log(`Created private bucket "${bucket}"`);
  }

  const challengesDir = path.join(process.cwd(), "challenges");
  const dirents = await fs.readdir(challengesDir, { withFileTypes: true });
  const slugs = dirents
    .filter(
      (d) => d.isDirectory() && !d.name.startsWith("_") && !d.name.startsWith("."),
    )
    .map((d) => d.name);

  let uploaded = 0;
  for (const slug of slugs) {
    const slugDir = path.join(challengesDir, slug);
    const meta = JSON.parse(
      await fs.readFile(path.join(slugDir, "meta.json"), "utf-8"),
    ) as ChallengeMeta;
    if (meta.slug !== slug) {
      throw new Error(`meta.slug "${meta.slug}" != dir "${slug}"`);
    }

    const dest = `${meta.difficulty}/${slug}`;
    for (const rel of await walk(slugDir)) {
      const content = await fs.readFile(path.join(slugDir, rel));
      const key = `${dest}/${rel}`;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(key, content, {
          upsert: true,
          contentType: contentTypeFor(rel),
        });
      if (error) throw new Error(`upload "${key}": ${error.message}`);
      uploaded++;
    }
    console.log(`↑ ${dest} (${slug})`);
  }

  // Manifest records the bucket layout: <difficulty>/<slug>.
  const store = new FilesystemStore();
  const manifest = await buildManifest(
    store,
    (_root, summary) => `${summary.meta.difficulty}/${summary.slug}`,
  );
  const { error } = await supabase.storage
    .from(bucket)
    .upload(MANIFEST_PATH, Buffer.from(serializeManifest(manifest)), {
      upsert: true,
      contentType: "application/json",
    });
  if (error) throw new Error(`upload manifest: ${error.message}`);

  console.log(
    `Seeded ${manifest.challenges.length} challenge(s), ${uploaded} file(s) + manifest to bucket "${bucket}".`,
  );
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
