import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/guards";
import { route } from "@/lib/api/http";
import { listChallengesForAdmin } from "@/lib/challenges/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/challenges
 *
 * Every challenge, draft and published. Admin-only; non-admins get a 404 so
 * the admin surface stays invisible (see `requireAdmin`).
 */
export const GET = route(async () => {
  await requireAdmin();
  return NextResponse.json({ challenges: await listChallengesForAdmin() });
});
