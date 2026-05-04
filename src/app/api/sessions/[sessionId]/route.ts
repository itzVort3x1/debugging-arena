import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";
import { serializeSession } from "@/lib/sessions";

const PatchSchema = z.object({
  fileState: z.record(z.string(), z.string()),
});

export async function GET(
  _req: Request,
  { params }: { params: { sessionId: string } }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await prisma.debugSession.findUnique({
    where: { id: params.sessionId },
  });
  // Return 404 (not 403) on ownership mismatch to avoid leaking which
  // session ids exist for other users.
  if (!session || session.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(serializeSession(session));
}

/** Autosave the user's edits. Replaces fileState wholesale. */
export async function PATCH(
  req: Request,
  { params }: { params: { sessionId: string } }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
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
      { error: "Session is not editable", status: session.status },
      { status: 409 }
    );
  }

  const updated = await prisma.debugSession.update({
    where: { id: session.id },
    data: { fileState: JSON.stringify(parsed.data.fileState) },
  });

  return NextResponse.json(serializeSession(updated));
}
