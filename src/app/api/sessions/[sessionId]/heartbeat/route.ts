import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api/http";
import { assertEditable, assertOwned, requireUserId } from "@/lib/api/guards";
import { creditForStretch } from "@/lib/session-time";

interface RouteContext {
    params: { sessionId: string };
}

export const dynamic = "force-dynamic";

/**
 * POST /api/sessions/[sessionId]/heartbeat
 *
 * Banks the working time since the previous beat and re-anchors the current
 * visit. Called by the arena on open and then on an interval while its tab is
 * visible.
 *
 * The credit is capped server-side (see `creditForStretch`), so the client
 * cannot inflate a session's time by beating late or by hand - it controls how
 * often a beat arrives, never how much any one beat is worth. Beating more
 * often than the interval is harmless too: each beat only credits real elapsed
 * time since the last.
 *
 * Answers 404 for a foreign or missing session and 409 once submitted, matching
 * the other session routes - a finished session's time is already stamped.
 */
export const POST = route<RouteContext>(async (_req, { params }) => {
    const userId = await requireUserId();

    const session = assertEditable(
        assertOwned(
            await prisma.debugSession.findUnique({
                where: { id: params.sessionId },
                select: {
                    id: true,
                    userId: true,
                    status: true,
                    activeSeconds: true,
                    resumedAt: true,
                },
            }),
            userId,
        ),
        "Session has already been submitted",
    );

    const now = new Date();
    const updated = await prisma.debugSession.update({
        where: { id: session.id },
        data: {
            activeSeconds:
                session.activeSeconds + creditForStretch(session.resumedAt, now),
            resumedAt: now,
        },
        select: { activeSeconds: true },
    });

    return NextResponse.json({ activeSeconds: updated.activeSeconds });
});
