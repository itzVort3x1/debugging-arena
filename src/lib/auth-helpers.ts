import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

/**
 * Returns the signed-in user's id, or null if there is no session.
 * Use in route handlers to gate authenticated endpoints:
 *
 *   const userId = await getSessionUserId();
 *   if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 */
export async function getSessionUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}
