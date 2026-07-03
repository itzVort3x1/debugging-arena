import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";
import { getChallenge } from "@/lib/challenges/registry";
import { runChallenge } from "@/lib/runner/runChallenge";
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
 * POST /api/sessions/[sessionId]/run
 *
 * Streams test output as Server-Sent Events. The fileState in the body
 * is persisted before the run starts (acts as an implicit autosave
 * flush). When the client disconnects mid-run, the jest child process
 * is killed via AbortController.
 *
 * Event types:
 *   stdout  → { chunk: string }   raw output as it streams
 *   stderr  → { chunk: string }
 *   result  → { passed, failed, total, exitCode, durationMs }
 *   error   → { message: string } fatal - stream is about to close
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

    await prisma.debugSession.update({
        where: { id: params.sessionId },
        data: { fileState: JSON.stringify(parsed.data.fileState) },
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            const abortController = new AbortController();
            req.signal.addEventListener("abort", () => abortController.abort());

            const emit = (event: string, data: unknown) => {
                try {
                    controller.enqueue(
                        encoder.encode(
                            `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
                        ),
                    );
                } catch {
                    // Controller already closed - happens on client disconnect.
                }
            };

            try {
                const result = await runChallenge(
                    challenge,
                    parsed.data.fileState,
                    {
                        onStdout: (chunk) => emit("stdout", { chunk }),
                        onStderr: (chunk) => emit("stderr", { chunk }),
                        signal: abortController.signal,
                    },
                );

                const updated = await prisma.debugSession.update({
                    where: { id: params.sessionId },
                    data: {
                        lastRunPassed: result.passed,
                        lastRunFailed: result.failed,
                        lastRunTotal: result.total,
                        lastRunAt: new Date(),
                        attemptsCount: { increment: 1 },
                    },
                    include: { hintRequests: { select: { level: true } } },
                });

                emit("result", {
                    passed: result.passed,
                    failed: result.failed,
                    total: result.total,
                    exitCode: result.exitCode,
                    durationMs: result.durationMs,
                    session: serializeSession(updated),
                });
            } catch (err) {
                emit("error", {
                    message:
                        err instanceof Error
                            ? err.message
                            : "Unknown runner error",
                });
            } finally {
                try {
                    controller.close();
                } catch {
                    // Already closed.
                }
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            // Tell nginx / Vercel edge to not buffer.
            "X-Accel-Buffering": "no",
        },
    });
}
