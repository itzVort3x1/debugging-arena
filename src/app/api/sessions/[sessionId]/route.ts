import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api/http";
import {
    assertEditable,
    assertOwned,
    parseJsonBody,
    requireUserId,
} from "@/lib/api/guards";
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
export const GET = route<RouteContext>(async (_req, { params }) => {
    const userId = await requireUserId();

    const session = assertOwned(
        await prisma.debugSession.findUnique({
            where: { id: params.sessionId },
            include: { hintRequests: { select: { level: true } } },
        }),
        userId,
    );

    return NextResponse.json(serializeSession(session));
});

/**
 * PATCH /api/sessions/[sessionId]
 *
 * Replace the session's fileState wholesale. Used by the editor autosave.
 * Returns 409 when the session is no longer editable (submitted, etc.).
 */
export const PATCH = route<RouteContext>(async (req, { params }) => {
    const userId = await requireUserId();
    const { fileState } = await parseJsonBody(req, PatchSchema);

    assertEditable(
        assertOwned(
            await prisma.debugSession.findUnique({
                where: { id: params.sessionId },
            }),
            userId,
        ),
    );

    const updated = await prisma.debugSession.update({
        where: { id: params.sessionId },
        data: { fileState: JSON.stringify(fileState) },
        include: { hintRequests: { select: { level: true } } },
    });

    return NextResponse.json(serializeSession(updated));
});
