import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/guards";
import { route } from "@/lib/api/http";
import { listChallengeVersions } from "@/lib/challenges/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/challenges/[slug]/versions
 *
 * The challenge's published history, newest first. Summaries only - a version's
 * file tree is fetched separately, since the list is rendered far more often
 * than any single snapshot is opened.
 */
export const GET = route<{ params: { slug: string } }>(
    async (_req, { params }) => {
        await requireAdmin();
        return NextResponse.json({
            versions: await listChallengeVersions(params.slug),
        });
    },
);
