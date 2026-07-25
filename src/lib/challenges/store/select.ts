import type { ChallengeStore } from "./types";
import { FilesystemStore } from "./filesystem";
import { SupabaseStore } from "./supabase";

/**
 * Pick the challenge store for this environment, mirroring how
 * `exec/select.ts` picks the runner executor. Controlled by
 * `ARENA_CHALLENGE_SOURCE`:
 *
 *   - `filesystem` (default) — the local `challenges/` dir (dev + test).
 *   - `supabase`             — Supabase Storage (the private `challenges`
 *                              bucket; needs SUPABASE_URL + service-role key).
 *
 * The store is stateless, so a process-wide singleton is fine.
 */
let store: ChallengeStore | null = null;

export function selectChallengeStore(): ChallengeStore {
  if (store) return store;

  const source = process.env.ARENA_CHALLENGE_SOURCE ?? "filesystem";
  switch (source) {
    case "filesystem":
      store = new FilesystemStore();
      break;
    case "supabase":
      store = new SupabaseStore();
      break;
    default:
      throw new Error(
        `Unknown ARENA_CHALLENGE_SOURCE "${source}" ` +
          '(expected "filesystem" or "supabase").',
      );
  }
  return store;
}
