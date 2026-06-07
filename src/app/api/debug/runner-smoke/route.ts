import { NextResponse } from "next/server";
import { getChallenge } from "@/lib/challenges/registry";
import { runChallenge } from "@/lib/runner/runChallenge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Smoke test for the runner. Runs the broken (starting) version of a
 * challenge against its tests and returns the structured result.
 *
 * TEMPORARY — deleted in PR 5.2 once /api/sessions/:id/run lands.
 *
 *   GET /api/debug/runner-smoke?slug=duplicate-chat-messages
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json(
      { error: "?slug= is required" },
      { status: 400 }
    );
  }

  const challenge = getChallenge(slug);
  if (!challenge) {
    return NextResponse.json(
      { error: `Challenge not found: ${slug}` },
      { status: 404 }
    );
  }

  // Seed with the editable files exactly as they ship in the challenge
  // (i.e. the broken state). This matches what POST /api/sessions seeds.
  const fileState: Record<string, string> = {};
  for (const f of challenge.files) fileState[f.path] = f.content;

  const result = await runChallenge(challenge, fileState);
  return NextResponse.json(result);
}
