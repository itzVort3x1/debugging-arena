import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

/**
 * Returns the authenticated user's id, or null if no session exists.
 * Use inside route handlers to gate access without pulling in the full
 * session object at every call site.
 */
export async function getSessionUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}
