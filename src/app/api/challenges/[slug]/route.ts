import { NextResponse } from "next/server";
import { getChallenge } from "@/lib/challenges/registry";
import { toClientChallenge } from "@/lib/challenges/client-view";

export const dynamic = "force-dynamic";

// TODO(phase-3): require an authenticated session.
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const challenge = await getChallenge(params.slug);
  if (!challenge) {
    return NextResponse.json(
      { error: "Challenge not found" },
      { status: 404 }
    );
  }

  // Hints are revealed progressively via the session API, and the solution
  // only after all of them. This route has no session, so nothing is revealed:
  // `toClientChallenge` with the default reveal state withholds every hint body
  // and the solution. It used to strip the same fields by hand here, which left
  // two places that had to agree on what is safe to send.
  return NextResponse.json(toClientChallenge(challenge));
}
