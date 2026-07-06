import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";
import { getChallenge } from "@/lib/challenges/registry";
import { serializeSession } from "@/lib/sessions";

interface RouteContext {
    params: { sessionId: string };
}

export const runtime = "nodejs";

/**
 * POST /api/sessions/[sessionId]/solution
 *
 * Reveal the full worked solution. This is the ultimate spoiler, so it is
 * gated server-side: every hint level must already be revealed, and the act
 * of revealing forfeits the score (see computeScore + the submit route).
 *
 * Idempotent - revealing twice just returns the current state.
 */
export async function POST(_req: Request, { params }: RouteContext) {
    const userId = await getSessionUserId();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await prisma.debugSession.findUnique({
        where: { id: params.sessionId },
        include: { hintRequests: { select: { level: true } } },
    });
    if (!session || session.userId !== userId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (session.status !== "IN_PROGRESS") {
        return NextResponse.json(
            { error: "Session is not editable" },
            { status: 409 },
        );
    }

    const challenge = getChallenge(session.challengeSlug);
    if (!challenge) {
        return NextResponse.json(
            { error: "Challenge no longer registered" },
            { status: 500 },
        );
    }
    if (!challenge.solution) {
        return NextResponse.json(
            { error: "This challenge has no solution to reveal" },
            { status: 400 },
        );
    }

    // Already revealed - return current state without re-checking the gate.
    if (session.solutionRevealed) {
        return NextResponse.json(serializeSession(session));
    }

    // Gate: every hint level must be revealed first.
    const revealedLevels = new Set(session.hintRequests.map((h) => h.level));
    const allHintsRevealed = challenge.hints.every((h) =>
        revealedLevels.has(h.level),
    );
    if (!allHintsRevealed) {
        return NextResponse.json(
            { error: "Reveal all hints before the solution" },
            { status: 409 },
        );
    }

    const updated = await prisma.debugSession.update({
        where: { id: session.id },
        data: { solutionRevealed: true },
        include: { hintRequests: { select: { level: true } } },
    });

    return NextResponse.json(serializeSession(updated));
}
