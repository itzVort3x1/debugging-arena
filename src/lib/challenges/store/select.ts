import type { ChallengeStore } from "./types";
import { FilesystemStore } from "./filesystem";

/**
 * Pick the challenge store for this environment, mirroring how
 * `exec/select.ts` picks the runner executor. Controlled by
 * `ARENA_CHALLENGE_SOURCE`:
 *
 *   - `filesystem` (default) — the local `challenges/` dir (dev + test).
 *   - `supabase`             — Supabase Storage (added in a later PR).
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
    // case "supabase": added when SupabaseStore lands.
    default:
      throw new Error(
        `Unknown ARENA_CHALLENGE_SOURCE "${source}" (expected "filesystem").`,
      );
  }
  return store;
}
