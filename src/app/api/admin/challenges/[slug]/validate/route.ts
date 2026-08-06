import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, requireAdmin } from "@/lib/api/guards";
import { route } from "@/lib/api/http";
import { validateChallengeTree } from "@/lib/challenges/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const validateSchema = z.object({
  content: z.record(z.string(), z.string()),
});

/**
 * POST /api/admin/challenges/[slug]/validate
 *
 * Check a candidate tree without saving it, so the editor can tell an author
 * whether a challenge would publish before they commit to publishing it.
 * Runs the same `loader.ts` the app serves through.
 */
export const POST = route<{ params: { slug: string } }>(
  async (req, { params }) => {
    await requireAdmin();
    const { content } = await parseJsonBody(req, validateSchema);
    const validation = await validateChallengeTree(params.slug, content);
    return NextResponse.json({
      ok: validation.ok,
      errors: validation.errors,
    });
  },
);
