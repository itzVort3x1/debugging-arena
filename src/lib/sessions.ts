import type { DebugSession } from "@prisma/client";
import type {
  DebugSessionResponse,
  SessionStatus,
} from "@/types/session";

/**
 * Convert a Prisma DebugSession row into the wire format.
 * - parses the `fileState` JSON-encoded string (falls back to {} on error)
 * - serializes dates to ISO strings
 */
export function serializeSession(s: DebugSession): DebugSessionResponse {
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
  };
}
