import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";
import { getChallenge } from "@/lib/challenges/registry";
import { runChallenge } from "@/lib/runner/runChallenge";

const BodySchema = z.object({
  fileState: z.record(z.string(), z.string()),
});

// Strip CSI escape sequences (colors, cursor moves, etc.). PR 5.3 will
// preserve colors and render them via ansi-to-html in the terminal panel.
const ANSI_CSI_RE = /\x1b\[[0-9;]*[A-Za-z]/g;
function stripAnsi(s: string): string {
  return s.replace(ANSI_CSI_RE, "");
}

interface RouteContext {
  params: { sessionId: string };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/sessions/[sessionId]/run
 *
 * Runs the challenge tests against the supplied fileState. The fileState
 * sent in the body is persisted to the session before the run — so
 * clicking "Run tests" implicitly flushes any pending autosave.
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
      { status: 400 }
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
      { status: 409 }
    );
  }

  const challenge = getChallenge(session.challengeSlug);
  if (!challenge) {
    return NextResponse.json(
      { error: "Challenge no longer registered" },
      { status: 500 }
    );
  }

  await prisma.debugSession.update({
    where: { id: params.sessionId },
    data: { fileState: JSON.stringify(parsed.data.fileState) },
  });

  const result = await runChallenge(challenge, parsed.data.fileState);

  return NextResponse.json({
    stdout: stripAnsi(result.stdout),
    stderr: stripAnsi(result.stderr),
    exitCode: result.exitCode,
    passed: result.passed,
    failed: result.failed,
    total: result.total,
    durationMs: result.durationMs,
  });
}
