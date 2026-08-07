import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/guards";
import { route } from "@/lib/api/http";
import {
  describeChallengeCache,
  getAllChallengeMeta,
} from "@/lib/challenges/registry";
import { selectChallengeStore } from "@/lib/challenges/store/select";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/challenges/source
 *
 * Which challenge store this instance is actually serving from. Answers the
 * only question that gates retiring `challenges/` from git — "is prod on
 * postgres yet?" — which was previously answerable only by reading the env of
 * the running process on the host.
 *
 * It reports three things that are easy to conflate:
 *
 *   - `configured` — the raw `ARENA_CHALLENGE_SOURCE`, or null when unset.
 *   - `store.kind` — the store that was actually constructed. Under normal
 *     operation this agrees with `configured`; it is reported separately
 *     because the singleton is built once per process, so an instance started
 *     before an env change keeps serving the old store until it restarts.
 *     That stale-process case is exactly the one a deploy check needs to catch,
 *     and comparing the env var to itself would never surface it.
 *   - `reachable` — whether the store can actually be read right now. A store
 *     that is configured and constructed can still fail on the first query
 *     (wrong DATABASE_URL, empty table), and that failure is a diagnostic
 *     result, not a server error — so it is reported as `reachable: false`
 *     with the message, at 200, rather than thrown as a 500.
 *
 * Admin-only, so non-admins get a 404 and the admin surface stays invisible.
 */
export const GET = route(async () => {
  await requireAdmin();

  // Snapshot the cache before reading through it: the read below warms the
  // index, so asking afterwards would always report a warm cache.
  const cache = describeChallengeCache();

  let kind: string | null = null;
  let reachable = false;
  let error: string | null = null;
  let slugs: string[] = [];

  try {
    // Inside the try on purpose. An unrecognized ARENA_CHALLENGE_SOURCE makes
    // this throw, and that is precisely the misconfiguration the probe exists
    // to name — letting it 500 would make the endpoint fail hardest in the case
    // it was written for.
    kind = selectChallengeStore().kind;
    slugs = (await getAllChallengeMeta()).map((m) => m.slug).sort();
    reachable = true;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    configured: process.env.ARENA_CHALLENGE_SOURCE ?? null,
    store: { kind },
    reachable,
    error,
    challengeCount: slugs.length,
    slugs,
    cache,
    checkedAt: new Date().toISOString(),
  });
});
