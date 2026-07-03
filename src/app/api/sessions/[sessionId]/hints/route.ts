import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";
import { getChallenge } from "@/lib/challenges/registry";
import { serializeSession } from "@/lib/sessions";

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
 * Idempotent - revealing the same level twice is a no-op thanks to the
 * @@unique([sessionId, level]) constraint; we swallow the duplicate and
 * return the current state either way.
 */
export async function POST(req: Request, { params }: RouteContext) {
    const userId = await getSessionUserId();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let payload: unknown;
    try {
        payload = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = BodySchema.safeParse(payload);
    if (!parsed.success) {
        const firstMessage = parsed.error.issues[0]?.message ?? "Invalid input";
        return NextResponse.json({ error: firstMessage }, { status: 400 });
    }
    const { level } = parsed.data;

    const session = await prisma.debugSession.findUnique({
        where: { id: params.sessionId },
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
    // The requested level must actually exist for this challenge.
    if (!challenge.hints.some((h) => h.level === level)) {
        return NextResponse.json(
            { error: `No hint at level ${level} for this challenge` },
            { status: 400 },
        );
    }

    // Record the reveal; ignore the unique-constraint violation that fires
    // when this level was already revealed.
    try {
        await prisma.hintRequest.create({
            data: { sessionId: session.id, level },
        });
    } catch {
        // P2002 unique violation - already revealed. Fall through.
    }

    // Recompute hintsUsed from the source of truth and return the full
    // session so the client can merge revealedHintLevels + hintsUsed.
    const updated = await prisma.debugSession.update({
        where: { id: session.id },
        data: {
            hintsUsed: await prisma.hintRequest.count({
                where: { sessionId: session.id },
            }),
        },
        include: { hintRequests: { select: { level: true } } },
    });

    return NextResponse.json(serializeSession(updated));
}
