import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { invalidateChallengeCache } from "@/lib/challenges/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Constant-time string compare (avoids leaking the secret via timing). */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * POST /api/admin/challenges/revalidate
 *
 * Clears this instance's challenge cache so freshly-seeded challenges appear
 * without a redeploy. Gated by a shared secret in `ARENA_REVALIDATE_SECRET`,
 * sent as `Authorization: Bearer <secret>` or `x-revalidate-secret`. When the
 * secret is unset the endpoint is disabled (404), so it's never open.
 *
 * The challenge cache is per instance, so in a multi-instance deploy each
 * instance must be hit (or the TTL waited out) for the change to be everywhere.
 */
export async function POST(req: Request) {
  const secret = process.env.ARENA_REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const provided =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    req.headers.get("x-revalidate-secret") ??
    "";
  if (!secretMatches(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  invalidateChallengeCache();
  return NextResponse.json({
    ok: true,
    revalidatedAt: new Date().toISOString(),
  });
}
