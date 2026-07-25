/**
 * Verify the seeded Supabase bucket loads every challenge byte-identically to
 * the local filesystem. Run after `seed-challenges.ts`, with the server env set:
 *
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npx tsx scripts/verify-supabase-parity.ts
 *
 * For each challenge × language it loads the full definition from both stores
 * and compares them; exits non-zero on any mismatch.
 */
import { FilesystemStore } from "../src/lib/challenges/store/filesystem";
import { SupabaseStore } from "../src/lib/challenges/store/supabase";
import {
  listChallengeRoots,
  loadChallenge,
  loadChallengeSummary,
} from "../src/lib/challenges/loader";

async function main() {
  const fsStore = new FilesystemStore();
  const sbStore = new SupabaseStore();

  const roots = await listChallengeRoots(fsStore);
  let allOk = true;

  for (const root of roots) {
    const summary = await loadChallengeSummary(fsStore, root);
    // The bucket lays challenges out under their difficulty folder.
    const bucketRoot = `${summary.meta.difficulty}/${summary.slug}`;

    for (const lang of summary.languages) {
      const local = await loadChallenge(fsStore, root, lang);
      const remote = await loadChallenge(sbStore, bucketRoot, lang);
      const ok = JSON.stringify(local) === JSON.stringify(remote);
      console.log(`${summary.slug}/${lang}: ${ok ? "OK" : "MISMATCH"}`);
      if (!ok) allOk = false;
    }
  }

  console.log(allOk ? "PARITY OK ✓" : "PARITY FAILED ✗");
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error("Parity check failed:", err);
  process.exit(1);
});
