import type { z } from "zod";
import type { ChallengeDefinition } from "../../../challenges/_schema";
import { getSessionUserId } from "@/lib/auth-helpers";
import { getChallenge } from "@/lib/challenges/registry";
import { HttpError } from "./http";

/**
 * Route guards. Each collapses a check-then-error pattern that every session
 * route repeated by hand into a single call that either returns the value or
 * throws an HttpError for the `route()` wrapper to serialize.
 */

/** Require an authenticated user; 401 otherwise. */
export async function requireUserId(): Promise<string> {
    const userId = await getSessionUserId();
    if (!userId) throw new HttpError(401, "Unauthorized");
    return userId;
}

/**
 * Parse the request body as JSON and validate it against `schema`. Throws
 * 400 "Invalid JSON" on malformed bodies, or 400 with the first zod issue
 * message (plus the full `issues` array) on validation failure.
 */
export async function parseJsonBody<T>(
    req: Request,
    schema: z.ZodType<T>,
): Promise<T> {
    let payload: unknown;
    try {
        payload = await req.json();
    } catch {
        throw new HttpError(400, "Invalid JSON");
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
        const firstMessage = parsed.error.issues[0]?.message ?? "Invalid input";
        throw new HttpError(400, firstMessage, { issues: parsed.error.issues });
    }
    return parsed.data;
}

/**
 * Assert the session exists and is owned by `userId`. Returns 404 (not 403)
 * for a missing OR foreign session so we never leak which session ids exist.
 *
 * Generic over the row shape so the caller's prisma `include` type flows
 * through untouched - callers keep their own query, we own the check.
 */
export function assertOwned<T extends { userId: string }>(
    session: T | null,
    userId: string,
): T {
    if (!session || session.userId !== userId) {
        throw new HttpError(404, "Not found");
    }
    return session;
}

/**
 * Assert the session is still editable (IN_PROGRESS); 409 otherwise. Pass a
 * custom message for routes that phrase it differently (e.g. submit).
 */
export function assertEditable<T extends { status: string }>(
    session: T,
    message = "Session is not editable",
): T {
    if (session.status !== "IN_PROGRESS") {
        throw new HttpError(409, message);
    }
    return session;
}

/**
 * Resolve the challenge for a submitted/stored slug. A missing challenge
 * here means a session references a slug that is no longer registered - a
 * server-side inconsistency, hence 500.
 */
export function requireChallenge(slug: string): ChallengeDefinition {
    const challenge = getChallenge(slug);
    if (!challenge) {
        throw new HttpError(500, "Challenge no longer registered");
    }
    return challenge;
}
