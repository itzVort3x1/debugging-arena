import type { z } from "zod";
import type { ChallengeDefinition, Runtime } from "../../../challenges/_schema";
import { getAdminUserId, getSessionUserId } from "@/lib/auth-helpers";
import { getChallenge, getChallengeLanguages } from "@/lib/challenges/registry";
import {
    getPinnedChallenge,
    getPinnedChallengeLanguages,
} from "@/lib/challenges/pinned";
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
 * Require an authenticated admin, returning their user id.
 *
 * Answers 404 — not 401/403 — for everyone else, anonymous or merely
 * non-admin, so the admin surface does not advertise its own existence. Same
 * don't-leak reasoning as `assertOwned`, and it matches the revalidate route,
 * which 404s when its secret is unset.
 *
 * The role lookup itself lives in `getAdminUserId` so pages (which `notFound()`
 * rather than throw) and route handlers share one implementation.
 */
export async function requireAdmin(): Promise<string> {
    const userId = await getAdminUserId();
    if (!userId) throw new HttpError(404, "Not found");
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
 * Resolve the challenge content a stored session should be served.
 *
 * Reads the session's pinned `ChallengeVersion` when it has one, so an admin
 * publishing an edit cannot change the description, hints or test files under
 * an attempt already in progress — and a score stays computed against the
 * content the user was actually given. Sessions created before pinning existed
 * have no version and read through to the live challenge, unchanged.
 *
 * A missing challenge here means a session references content that is no longer
 * resolvable - a server-side inconsistency, hence 500.
 *
 * Tolerant of a stale/mismatched `language`: if it isn't one the challenge
 * offers (e.g. a legacy row's default that predates the variant), it falls
 * back to the default variant, so single-language sessions can never 500 on a
 * language mismatch.
 */
export async function requireChallenge(
    slug: string,
    language?: string,
    pinnedVersion?: number | null,
): Promise<ChallengeDefinition> {
    const languages =
        pinnedVersion == null
            ? await getChallengeLanguages(slug)
            : await getPinnedChallengeLanguages(slug, pinnedVersion);
    if (!languages) {
        throw new HttpError(500, "Challenge no longer registered");
    }
    const resolved =
        language && languages.includes(language as Runtime)
            ? (language as Runtime)
            : undefined; // let the resolver pick the default variant
    const challenge =
        pinnedVersion == null
            ? await getChallenge(slug, resolved)
            : await getPinnedChallenge(slug, pinnedVersion, resolved);
    if (!challenge) {
        throw new HttpError(500, "Challenge no longer registered");
    }
    return challenge;
}
