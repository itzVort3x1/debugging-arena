import type { ChallengeStore } from "./types";
import { FilesystemStore } from "./filesystem";
import { SupabaseStore } from "./supabase";
import { PostgresStore } from "./postgres";

/**
 * Pick the challenge store for this environment, mirroring how
 * `exec/select.ts` picks the runner executor. Controlled by
 * `ARENA_CHALLENGE_SOURCE`:
 *
 *   - `filesystem` (default) — the local `challenges/` dir (dev + test).
 *   - `postgres`             — the `Challenge` table, the source of truth in
 *                              prod (needs DATABASE_URL).
 *   - `supabase`             — Supabase Storage (the private `challenges`
 *                              bucket; needs SUPABASE_URL + service-role key).
 *                              Superseded by `postgres`; kept until the DB path
 *                              is proven in prod.
 *
 * A process-wide singleton. Stores that cache (postgres) expose `invalidate()`,
 * which `invalidateChallengeCache()` calls.
 */
let store: ChallengeStore | null = null;

export function selectChallengeStore(): ChallengeStore {
  if (store) return store;

  const source = process.env.ARENA_CHALLENGE_SOURCE ?? "filesystem";
  switch (source) {
    case "filesystem":
      store = new FilesystemStore();
      break;
    case "postgres":
      store = new PostgresStore();
      break;
    case "supabase":
      store = new SupabaseStore();
      break;
    default:
      throw new Error(
        `Unknown ARENA_CHALLENGE_SOURCE "${source}" ` +
          '(expected "filesystem", "postgres" or "supabase").',
      );
  }
  return store;
}
