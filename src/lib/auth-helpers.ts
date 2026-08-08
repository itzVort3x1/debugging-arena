import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";

/**
 * Returns the authenticated user's id, or null if no session exists.
 * Use inside route handlers to gate access without pulling in the full
 * session object at every call site.
 */
export async function getSessionUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

/** The privileged value of `User.role`. Everyone else is "USER". */
export const ADMIN_ROLE = "ADMIN";

/**
 * The current user's id if they are an admin, else null.
 *
 * The role is read from the database on every call rather than carried in the
 * session token. Sessions here are JWT-backed (see `authOptions`), so a role
 * baked into the token would keep saying ADMIN until that token expired, even
 * after a demotion. Admin traffic is low and this is a primary-key lookup, so
 * paying for one query is the right trade on a surface whose writes become code
 * the runner executes.
 *
 * Route handlers should use `requireAdmin` (see lib/api/guards); pages call
 * this directly and `notFound()` themselves.
 */
export async function getAdminUserId(): Promise<string | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === ADMIN_ROLE ? userId : null;
}

/**
 * What the nav needs about the current user, in one query: whether to offer the
 * admin link, and which avatar to draw.
 *
 * Both are read from the database rather than the JWT for the same reason - a
 * token minted before a promotion or an avatar upload would keep serving the
 * stale value until it expired.
 */
export async function getNavUser(): Promise<{
  isAdmin: boolean;
  image: string | null;
} | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, image: true },
  });
  if (!user) return null;

  return { isAdmin: user.role === ADMIN_ROLE, image: user.image };
}
