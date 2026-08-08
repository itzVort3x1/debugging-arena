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
 * Health of the challenge store this instance reads through.
 *
 * It was written to answer "is prod on postgres yet?", the question that gated
 * dropping `challenges/` from git. That question is now settled - Postgres is
 * the only store - so the env-var reporting is gone. What remains is the part
 * that stays useful with one backend: whether the store can actually be read,
 * what it holds, and how warm the registry cache is.
 *
 *   - `reachable` - whether the store answers right now. A constructed store
 *     can still fail on its first query (wrong DATABASE_URL, unmigrated
 *     database, empty table), and that failure is a diagnostic result rather
 *     than a server error - reported at 200 with the message, not thrown as
 *     a 500, so the probe is most informative exactly when things are broken.
 *   - `cache` - snapshotted before the read below, which warms it.
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
        kind = selectChallengeStore().kind;
        slugs = (await getAllChallengeMeta()).map((m) => m.slug).sort();
        reachable = true;
    } catch (err) {
        error = err instanceof Error ? err.message : String(err);
    }

    return NextResponse.json({
        store: { kind },
        reachable,
        error,
        challengeCount: slugs.length,
        slugs,
        cache,
        checkedAt: new Date().toISOString(),
    });
});
