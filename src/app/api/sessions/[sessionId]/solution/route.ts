import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, route } from "@/lib/api/http";
import {
    assertEditable,
    assertOwned,
    requireChallenge,
    requireUserId,
} from "@/lib/api/guards";
import { loadSharedReveals, serializeSession } from "@/lib/sessions";

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
 * The reveal is SHARED per (user, challenge): it is stored in
 * UserChallengeProgress, so revealing in one language forfeits the score in
 * every language and shows as revealed after a language switch.
 *
 * Idempotent - revealing twice just returns the current state.
 */
export const POST = route<RouteContext>(async (_req, { params }) => {
    const userId = await requireUserId();

    const session = assertEditable(
        assertOwned(
            await prisma.debugSession.findUnique({
                where: { id: params.sessionId },
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

    const shared = await loadSharedReveals(userId, session.challengeSlug);

    // Already revealed - return current state without re-checking the gate.
    if (shared.solutionRevealed) {
        return NextResponse.json(serializeSession(session, shared));
    }

    // Gate: every hint level must be revealed first (shared reveal state).
    const revealedLevels = new Set(shared.revealedHintLevels);
    const allHintsRevealed = challenge.hints.every((h) =>
        revealedLevels.has(h.level),
    );
    if (!allHintsRevealed) {
        throw new HttpError(409, "Reveal all hints before the solution");
    }

    // Persist the shared reveal (idempotent) - the sole source of truth now.
    await prisma.userChallengeProgress.upsert({
        where: {
            userId_challengeSlug: {
                userId,
                challengeSlug: session.challengeSlug,
            },
        },
        create: {
            userId,
            challengeSlug: session.challengeSlug,
            solutionRevealed: true,
        },
        update: { solutionRevealed: true },
    });

    return NextResponse.json(
        serializeSession(session, { ...shared, solutionRevealed: true }),
    );
});
