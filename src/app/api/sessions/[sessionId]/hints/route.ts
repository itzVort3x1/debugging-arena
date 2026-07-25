import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { HttpError, route } from "@/lib/api/http";
import {
    assertEditable,
    assertOwned,
    parseJsonBody,
    requireChallenge,
    requireUserId,
} from "@/lib/api/guards";
import { loadSharedReveals, serializeSession } from "@/lib/sessions";

const BodySchema = z.object({
    level: z.number().int().min(1).max(4),
});

interface RouteContext {
    params: { sessionId: string };
}

export const runtime = "nodejs";

/**
 * POST /api/sessions/[sessionId]/hints
 *
 * Reveal a hint level for the session. Server-authoritative: the penalty
 * lives on the challenge definition, and we record which levels were
 * revealed in HintRequest so scoring (PR 6.3) can't be gamed client-side.
 *
 * Hint reveals are SHARED per (user, challenge): the record is keyed on
 * (userId, challengeSlug, level), so revealing a hint in one language shows
 * it viewed - and penalized - in every language for that challenge.
 *
 * Idempotent - revealing the same level twice is a no-op thanks to the
 * @@unique([userId, challengeSlug, level]) constraint; we swallow the
 * duplicate and return the current state either way.
 */
export const POST = route<RouteContext>(async (req, { params }) => {
    const userId = await requireUserId();
    const { level } = await parseJsonBody(req, BodySchema);

    const session = assertEditable(
        assertOwned(
            await prisma.debugSession.findUnique({
                where: { id: params.sessionId },
            }),
            userId,
        ),
    );

    const challenge = await requireChallenge(
        session.challengeSlug,
        session.language,
    );
    // The requested level must actually exist for this challenge.
    if (!challenge.hints.some((h) => h.level === level)) {
        throw new HttpError(
            400,
            `No hint at level ${level} for this challenge`,
        );
    }

    // Record the shared reveal; ignore the unique-constraint violation that
    // fires when this level was already revealed for this user+challenge.
    // sessionId is kept for audit only.
    try {
        await prisma.hintRequest.create({
            data: {
                userId,
                challengeSlug: session.challengeSlug,
                sessionId: session.id,
                level,
            },
        });
    } catch {
        // P2002 unique violation - already revealed. Fall through.
    }

    // Recompute hintsUsed from the shared reveal state and return the full
    // session so the client can merge revealedHintLevels + hintsUsed.
    const shared = await loadSharedReveals(userId, session.challengeSlug);
    const updated = await prisma.debugSession.update({
        where: { id: session.id },
        data: { hintsUsed: shared.revealedHintLevels.length },
    });

    return NextResponse.json(serializeSession(updated, shared));
});
