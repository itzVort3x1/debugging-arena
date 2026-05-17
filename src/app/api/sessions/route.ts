import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";
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
export async function POST(req: Request) {
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

  const parsed = CreateSessionSchema.safeParse(payload);
  if (!parsed.success) {
    const firstMessage = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json(
      { error: firstMessage, issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { challengeSlug } = parsed.data;
  const challenge = getChallenge(challengeSlug);
  if (!challenge) {
    return NextResponse.json(
      { error: "Challenge not found" },
      { status: 404 }
    );
  }

  // Resume the most recent IN_PROGRESS session if any.
  const existing = await prisma.debugSession.findFirst({
    where: { userId, challengeSlug, status: "IN_PROGRESS" },
    orderBy: { startedAt: "desc" },
  });
  if (existing) {
    return NextResponse.json(serializeSession(existing), { status: 200 });
  }

  // Seed fileState with the challenge's editable files at their starting
  // contents. Read-only test files are NOT included — they're served from
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
}
