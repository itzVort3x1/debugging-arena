import type { DebugSession } from "@prisma/client";
import type {
  DebugSessionResponse,
  SessionStatus,
} from "@/types/session";

/**
 * A DebugSession row that may carry its hint requests. Routes that want
 * `revealedHintLevels` populated should `include: { hintRequests: ... }`;
 * callers without the relation get an empty array.
 */
export type DebugSessionWithHints = DebugSession & {
  hintRequests?: { level: number }[];
};

/**
 * Convert a Prisma DebugSession row into the wire format.
 * - parses the `fileState` JSON-encoded string (falls back to {} on error)
 * - serializes dates to ISO strings
 * - derives `revealedHintLevels` from the hintRequests relation if loaded
 */
export function serializeSession(
  s: DebugSessionWithHints
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
    revealedHintLevels: s.hintRequests
      ? Array.from(new Set(s.hintRequests.map((h) => h.level))).sort(
          (a, b) => a - b
        )
      : [],
  };
}
