import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";
import { serializeSession } from "@/lib/sessions";

const PatchSchema = z.object({
    fileState: z.record(z.string(), z.string()),
});

interface RouteContext {
    params: { sessionId: string };
}

/**
 * GET /api/sessions/[sessionId]
 *
 * Fetch a session by id. Returns 404 (not 403) when the caller is not the
 * owner - we don't want to leak which session ids exist.
 */
export async function GET(_req: Request, { params }: RouteContext) {
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

    return NextResponse.json(serializeSession(session));
}

/**
 * PATCH /api/sessions/[sessionId]
 *
 * Replace the session's fileState wholesale. Used by the editor autosave.
 * Returns 409 when the session is no longer editable (submitted, etc.).
 */
export async function PATCH(req: Request, { params }: RouteContext) {
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

    const parsed = PatchSchema.safeParse(payload);
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

    const updated = await prisma.debugSession.update({
        where: { id: params.sessionId },
        data: { fileState: JSON.stringify(parsed.data.fileState) },
        include: { hintRequests: { select: { level: true } } },
    });

    return NextResponse.json(serializeSession(updated));
}
