import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { HttpError, route } from "@/lib/api/http";
import { parseJsonBody, requireUserId } from "@/lib/api/guards";
import { getChallenge } from "@/lib/challenges/registry";
import { serializeSession } from "@/lib/sessions";

const CreateSessionSchema = z.object({
    challengeSlug: z.string().min(1).max(100),
});

/**
 * POST /api/sessions
 *
 * Creates a fresh DebugSession for the given challenge, OR resumes the
 * caller's most recent IN_PROGRESS session for that challenge if one already
 * exists. Idempotent: hitting this twice without finishing the first
 * session returns the same row both times.
 */
export const POST = route(async (req: Request) => {
    const userId = await requireUserId();
    const { challengeSlug } = await parseJsonBody(req, CreateSessionSchema);

    // A missing challenge here is a bad client-supplied slug, so 404 (unlike
    // the 500 used when a stored session references an unregistered slug).
    const challenge = getChallenge(challengeSlug);
    if (!challenge) {
        throw new HttpError(404, "Challenge not found");
    }

    // Resume the most recent IN_PROGRESS session if any.
    const existing = await prisma.debugSession.findFirst({
        where: { userId, challengeSlug, status: "IN_PROGRESS" },
        orderBy: { startedAt: "desc" },
        include: { hintRequests: { select: { level: true } } },
    });
    if (existing) {
        return NextResponse.json(serializeSession(existing), { status: 200 });
    }

    // Seed fileState with the challenge's editable files at their starting
    // contents. Read-only test files are NOT included - they're served from
    // the registry, never persisted per-session.
    const seededFileState: Record<string, string> = {};
    for (const file of challenge.files) {
        seededFileState[file.path] = file.content;
    }

    const created = await prisma.debugSession.create({
        data: {
            userId,
            challengeSlug,
            status: "IN_PROGRESS",
            fileState: JSON.stringify(seededFileState),
        },
    });

    return NextResponse.json(serializeSession(created), { status: 201 });
});
