export type SessionStatus =
    | "IN_PROGRESS"
    | "SUBMITTED"
    | "COMPLETED"
    | "ABANDONED";

/**
 * POST /api/sessions/[id]/hints. Carries the hint body, which the page payload
 * withholds until the level is revealed — keyed by language because a reveal is
 * shared across every variant of the challenge.
 */
export interface RevealHintResponse extends DebugSessionResponse {
    hint?: {
        level: number;
        contentByLanguage: Record<string, string>;
    };
}

/** POST /api/sessions/[id]/solution. As above, for the worked solution. */
export interface RevealSolutionResponse extends DebugSessionResponse {
    solutionByLanguage?: Record<string, string>;
}

export interface DebugSessionResponse {
    id: string;
    userId: string;
    challengeSlug: string;
    /** Language variant this session is solved in (a Runtime value). */
    language: string;
    status: SessionStatus;
    /** ISO 8601 string. */
    startedAt: string;
    /** ISO 8601 string, or null if still in progress. */
    completedAt: string | null;
    hintsUsed: number;
    attemptsCount: number;
    /** Seconds. */
    timeTaken: number | null;
    score: number | null;
    /** Parsed from DB column; map of relative path → file contents. */
    fileState: Record<string, string>;

    /** Denormalized counts from the most recent run. Null until first run. */
    lastRunPassed: number | null;
    lastRunFailed: number | null;
    lastRunTotal: number | null;
    /** ISO 8601 string. Null until first run. */
    lastRunAt: string | null;

    /** Hint levels revealed for this session, ascending. Empty if none. */
    revealedHintLevels: number[];

    /** True once the full solution was revealed - forfeits the score. */
    solutionRevealed: boolean;
}
