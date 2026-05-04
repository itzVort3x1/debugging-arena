import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";
import { getChallenge } from "@/lib/challenges/registry";
import { serializeSession } from "@/lib/sessions";

const CreateSchema = z.object({
  challengeSlug: z.string().min(1),
});

/**
 * Create a new DebugSession or resume the existing IN_PROGRESS one for
 * (currentUser, challengeSlug). Idempotent: repeated POSTs return the same
 * in-progress session until it's submitted/completed.
 */
export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const challenge = getChallenge(parsed.data.challengeSlug);
  if (!challenge) {
    return NextResponse.json(
      { error: "Challenge not found" },
      { status: 404 }
    );
  }

  const existing = await prisma.debugSession.findFirst({
    where: {
      userId,
      challengeSlug: challenge.meta.slug,
      status: "IN_PROGRESS",
    },
    orderBy: { startedAt: "desc" },
  });
  if (existing) {
    return NextResponse.json(serializeSession(existing));
  }

  // Seed fileState with the original (broken) file contents the user will edit.
  const seed: Record<string, string> = {};
  for (const f of challenge.files) seed[f.path] = f.content;

  const created = await prisma.debugSession.create({
    data: {
      userId,
      challengeSlug: challenge.meta.slug,
      fileState: JSON.stringify(seed),
    },
  });

  return NextResponse.json(serializeSession(created), { status: 201 });
}
