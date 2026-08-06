import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/guards";
import { HttpError, route } from "@/lib/api/http";
import { getChallengeVersion } from "@/lib/challenges/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/challenges/[slug]/versions/[version]
 *
 * One snapshot with its full file tree, so the editor can load it as the
 * working copy. Read-only: restoring is the author saving that content back
 * as a new version, which keeps the history append-only.
 */
export const GET = route<{ params: { slug: string; version: string } }>(
  async (_req, { params }) => {
    await requireAdmin();

    const version = Number(params.version);
    if (!Number.isInteger(version) || version < 1) {
      throw new HttpError(400, "Invalid version");
    }

    const snapshot = await getChallengeVersion(params.slug, version);
    if (!snapshot) throw new HttpError(404, "Not found");

    return NextResponse.json({ version: snapshot });
  },
);
