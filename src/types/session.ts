export type SessionStatus =
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "COMPLETED"
  | "ABANDONED";

export interface DebugSessionResponse {
  id: string;
  userId: string;
  challengeSlug: string;
  status: SessionStatus;
  startedAt: string;
  completedAt: string | null;
  hintsUsed: number;
  attemptsCount: number;
  timeTaken: number | null;
  score: number | null;
  fileState: Record<string, string>;
}
