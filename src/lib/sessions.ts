import type { DebugSession } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  DebugSessionResponse,
  SessionStatus,
} from "@/types/session";

/**
 * Reveal state that is SHARED per (user, challenge) rather than per session:
 * hint reveals and the solution reveal apply across every language a
 * challenge offers. Sourced from HintRequest + UserChallengeProgress.
 */
export interface SharedReveals {
  /** Distinct hint levels revealed for this user+challenge, ascending. */
  revealedHintLevels: number[];
  /** True once the worked solution was revealed for this user+challenge. */
  solutionRevealed: boolean;
}

const NO_REVEALS: SharedReveals = {
  revealedHintLevels: [],
  solutionRevealed: false,
};

/**
 * Load the shared reveal state for a (user, challenge). Hint reveals live in
 * HintRequest (keyed on userId+challengeSlug+level) and the solution reveal in
 * UserChallengeProgress - both independent of language and of any one session.
 */
export async function loadSharedReveals(
  userId: string,
  challengeSlug: string
): Promise<SharedReveals> {
  const [hints, progress] = await Promise.all([
    prisma.hintRequest.findMany({
      where: { userId, challengeSlug },
      select: { level: true },
    }),
    prisma.userChallengeProgress.findUnique({
      where: { userId_challengeSlug: { userId, challengeSlug } },
      select: { solutionRevealed: true },
    }),
  ]);

  return {
    revealedHintLevels: Array.from(
      new Set(hints.map((h) => h.level))
    ).sort((a, b) => a - b),
    solutionRevealed: progress?.solutionRevealed ?? false,
  };
}

/**
 * Convert a Prisma DebugSession row into the wire format.
 * - parses the `fileState` JSON-encoded string (falls back to {} on error)
 * - serializes dates to ISO strings
 * - `revealedHintLevels` + `solutionRevealed` come from the SHARED reveal
 *   state (per user+challenge), so they read identically in every language;
 *   callers load it via {@link loadSharedReveals}. Omitting `shared` yields an
 *   empty reveal state (used where reveal fields are irrelevant).
 */
export function serializeSession(
  s: DebugSession,
  shared: SharedReveals = NO_REVEALS
): DebugSessionResponse {
  let fileState: Record<string, string> = {};
  try {
    const parsed = JSON.parse(s.fileState);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      fileState = parsed as Record<string, string>;
    }
  } catch {
    fileState = {};
  }

  return {
    id: s.id,
    userId: s.userId,
    challengeSlug: s.challengeSlug,
    language: s.language,
    status: s.status as SessionStatus,
    startedAt: s.startedAt.toISOString(),
    completedAt: s.completedAt ? s.completedAt.toISOString() : null,
    hintsUsed: s.hintsUsed,
    attemptsCount: s.attemptsCount,
    timeTaken: s.timeTaken,
    score: s.score,
    fileState,
    lastRunPassed: s.lastRunPassed,
    lastRunFailed: s.lastRunFailed,
    lastRunTotal: s.lastRunTotal,
    lastRunAt: s.lastRunAt ? s.lastRunAt.toISOString() : null,
    revealedHintLevels: shared.revealedHintLevels,
    solutionRevealed: shared.solutionRevealed,
  };
}
