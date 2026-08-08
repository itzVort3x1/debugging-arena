import type { ChallengeStore } from "./types";
import { PostgresStore } from "./postgres";

/**
 * The challenge store the app reads through: the `Challenge` table, and now the
 * only source there is. `challenges/` left version control once the admin UI
 * became the way challenges are authored, so there is no longer a filesystem
 * backend to choose between - and with it went `ARENA_CHALLENGE_SOURCE`.
 *
 * The seam itself is worth keeping even with one implementation: `MemoryStore`
 * still satisfies it, which is what lets the admin editor validate an unsaved
 * tree through the same loader that will later serve it.
 *
 * A process-wide singleton, because `PostgresStore` memoizes rows - that is
 * what `invalidate()` exists to clear, via `invalidateChallengeCache()`.
 */
let store: ChallengeStore | null = null;

export function selectChallengeStore(): ChallengeStore {
    if (!store) store = new PostgresStore();
    return store;
}
