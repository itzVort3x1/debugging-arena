import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, requireAdmin } from "@/lib/api/guards";
import { HttpError, route } from "@/lib/api/http";
import {
    createChallenge,
    listChallengesForAdmin,
} from "@/lib/challenges/admin";
import { buildScaffold, slugError } from "@/lib/challenges/scaffold";
import { SUPPORTED_RUNTIMES } from "@/lib/runner/languages/registry";

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

const createSchema = z.object({
    slug: z.string(),
    title: z.string().min(1, "Title is required").max(120),
    difficulty: z.enum(["easy", "medium", "hard"]),
    runtime: z.string(),
});

/**
 * POST /api/admin/challenges
 *
 * Creates a DRAFT challenge from a scaffolded starter tree. The client sends
 * only the identifying fields - the server builds the tree, so the creation
 * path can't be used to post an arbitrary file tree before anything has
 * validated it.
 */
export const POST = route(async (req) => {
    await requireAdmin();
    const body = await parseJsonBody(req, createSchema);

    const slug = body.slug.trim().toLowerCase();
    const invalidSlug = slugError(slug);
    if (invalidSlug) throw new HttpError(400, invalidSlug);

    // Only offer languages that can actually execute; "declared but unimplemented"
    // runtimes (go, rust) would produce a challenge whose tests could never run.
    if (!SUPPORTED_RUNTIMES.includes(body.runtime as never)) {
        throw new HttpError(
            400,
            `Unsupported runtime "${body.runtime}" (expected ${SUPPORTED_RUNTIMES.join(", ")})`,
        );
    }

    const tree = buildScaffold({
        slug,
        title: body.title.trim(),
        difficulty: body.difficulty,
        runtime: body.runtime as (typeof SUPPORTED_RUNTIMES)[number],
    });

    // The creator is not recorded here: a draft writes no version row, and
    // authorship is captured on the first publish instead. requireAdmin above
    // still gates the request, its return value just has nothing to record.
    const result = await createChallenge({ slug, tree });
    if (!result.created) {
        throw new HttpError(
            result.reason === "taken" ? 409 : 400,
            result.reason === "taken"
                ? `A challenge with slug "${slug}" already exists`
                : "Scaffold failed validation",
            result.errors.length > 0 ? { errors: result.errors } : undefined,
        );
    }

    return NextResponse.json({ ok: true, slug }, { status: 201 });
});
