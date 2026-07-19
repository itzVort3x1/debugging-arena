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
import { runChallenge } from "@/lib/runner/runChallenge";
import { RunnerBusyError } from "@/lib/runner/concurrency";
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
export const POST = route<RouteContext>(async (req, { params }) => {
    const userId = await requireUserId();
    const { fileState } = await parseJsonBody(req, BodySchema);

    const session = assertEditable(
        assertOwned(
            await prisma.debugSession.findUnique({
                where: { id: params.sessionId },
                include: { hintRequests: { select: { level: true } } },
            }),
            userId,
        ),
        "Session has already been submitted",
    );

    const challenge = requireChallenge(session.challengeSlug, session.language);

    // Persist the submitted buffer before verifying (implicit autosave flush).
    await prisma.debugSession.update({
        where: { id: params.sessionId },
        data: { fileState: JSON.stringify(fileState) },
    });

    // Re-run the suite ourselves - authoritative pass/fail.
    let result;
    try {
        result = await runChallenge(challenge, fileState);
    } catch (err) {
        // Runner at capacity → 503 so the client knows to retry, not a 500.
        if (err instanceof RunnerBusyError) {
            throw new HttpError(503, err.message);
        }
        throw new HttpError(
            500,
            err instanceof Error
                ? err.message
                : "Test runner failed to start",
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
        throw new HttpError(
            409,
            result.total === 0
                ? "No tests ran - cannot submit."
                : "Not all tests pass yet.",
            {
                passed: result.passed,
                failed: result.failed,
                total: result.total,
                session: serializeSession(updated),
            },
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
});
