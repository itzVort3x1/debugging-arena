import { NextResponse } from "next/server";
import { getChallenge } from "@/lib/challenges/registry";

export const dynamic = "force-dynamic";

// TODO(phase-3): require an authenticated session.
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const challenge = getChallenge(params.slug);
  if (!challenge) {
    return NextResponse.json(
      { error: "Challenge not found" },
      { status: 404 }
    );
  }

  // Hints are revealed progressively via the session API. Surface the
  // title + cost so the UI can render the locked tile, but withhold content.
  const hints = challenge.hints.map((h) => ({
    level: h.level,
    title: h.title,
    penaltyPoints: h.penaltyPoints,
  }));

  return NextResponse.json({
    meta: challenge.meta,
    description: challenge.description,
    files: challenge.files,
    testFiles: challenge.testFiles,
    hints,
  });
}
