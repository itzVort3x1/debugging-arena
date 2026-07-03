import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";
import { getChallenge } from "@/lib/challenges/registry";
import { runChallenge } from "@/lib/runner/runChallenge";
import { computeScore } from "@/lib/scoring";
import { serializeSession } from "@/lib/sessions";

const BodySchema = z.object({
    fileState: z.record(z.string(), z.string()),
});

interface RouteContext {
    params: { sessionId: string };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/sessions/[sessionId]/submit
 *
 * Finalizes a session. The submitted fileState is persisted, then the
 * tests are re-run SERVER-SIDE - we never trust the client's claim that
 * they pass. If anything fails (or there are no tests), we return 409 and
 * leave the session IN_PROGRESS so the user can keep working.
 *
 * On an all-green run we compute the score from server-authoritative
 * inputs (revealed hint levels, attempt count, elapsed time), mark the
 * session SUBMITTED, and stamp completedAt / timeTaken / score. Once
 * SUBMITTED the session is final - the IN_PROGRESS gate here (and in the
 * run/patch/hints routes) blocks any further edits.
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
        return NextResponse.json(
            { error: firstMessage, issues: parsed.error.issues },
            { status: 400 },
        );
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
            { error: "Session has already been submitted" },
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

    // Persist the submitted buffer before verifying (implicit autosave flush).
    await prisma.debugSession.update({
        where: { id: params.sessionId },
        data: { fileState: JSON.stringify(parsed.data.fileState) },
    });

    // Re-run the suite ourselves - authoritative pass/fail.
    let result;
    try {
        result = await runChallenge(challenge, parsed.data.fileState);
    } catch (err) {
        return NextResponse.json(
            {
                error:
                    err instanceof Error
                        ? err.message
                        : "Test runner failed to start",
            },
            { status: 500 },
        );
    }

    const allGreen = result.total > 0 && result.failed === 0;

    // Record this run's counts either way so the badge stays truthful.
    const runCounts = {
        lastRunPassed: result.passed,
        lastRunFailed: result.failed,
        lastRunTotal: result.total,
        lastRunAt: new Date(),
    };

    if (!allGreen) {
        const updated = await prisma.debugSession.update({
            where: { id: params.sessionId },
            data: runCounts,
            include: { hintRequests: { select: { level: true } } },
        });
        return NextResponse.json(
            {
                error:
                    result.total === 0
                        ? "No tests ran - cannot submit."
                        : "Not all tests pass yet.",
                passed: result.passed,
                failed: result.failed,
                total: result.total,
                session: serializeSession(updated),
            },
            { status: 409 },
        );
    }

    const revealedHintLevels = Array.from(
        new Set(session.hintRequests.map((h) => h.level)),
    );
    const completedAt = new Date();
    const timeTaken = Math.max(
        0,
        Math.round(
            (completedAt.getTime() - session.startedAt.getTime()) / 1000,
        ),
    );
    const breakdown = computeScore({
        challenge,
        revealedHintLevels,
        attemptsCount: session.attemptsCount,
        timeTaken,
        solutionRevealed: session.solutionRevealed,
    });

    const updated = await prisma.debugSession.update({
        where: { id: params.sessionId },
        data: {
            ...runCounts,
            status: "SUBMITTED",
            completedAt,
            timeTaken,
            score: breakdown.score,
        },
        include: { hintRequests: { select: { level: true } } },
    });

    return NextResponse.json({
        session: serializeSession(updated),
        breakdown,
    });
}
