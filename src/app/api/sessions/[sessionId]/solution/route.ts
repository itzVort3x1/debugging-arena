import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, route } from "@/lib/api/http";
import {
    assertEditable,
    assertOwned,
    requireChallenge,
    requireUserId,
} from "@/lib/api/guards";
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
export const POST = route<RouteContext>(async (_req, { params }) => {
    const userId = await requireUserId();

    const session = assertEditable(
        assertOwned(
            await prisma.debugSession.findUnique({
                where: { id: params.sessionId },
                include: { hintRequests: { select: { level: true } } },
            }),
            userId,
        ),
    );

    const challenge = requireChallenge(session.challengeSlug, session.language);
    if (!challenge.solution) {
        throw new HttpError(
            400,
            "This challenge has no solution to reveal",
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
        throw new HttpError(409, "Reveal all hints before the solution");
    }

    const updated = await prisma.debugSession.update({
        where: { id: session.id },
        data: { solutionRevealed: true },
        include: { hintRequests: { select: { level: true } } },
    });

    return NextResponse.json(serializeSession(updated));
});
