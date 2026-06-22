import type { ChallengeDefinition } from "../../challenges/_schema";

export interface ScoreInput {
  challenge: ChallengeDefinition;
  /** Distinct hint levels the user revealed. */
  revealedHintLevels: number[];
  /** Total run attempts on the session. */
  attemptsCount: number;
  /** Seconds elapsed from start to submission. Null if unknown. */
  timeTaken: number | null;
}

export interface ScoreBreakdown {
  /** Final clamped score, 0–100. */
  score: number;
  base: number;
  hintPenalty: number;
  attemptPenalty: number;
  timeAdjustment: number;
}

const BASE = 100;

/** −2 per attempt beyond the first, capped at −20 (i.e. 10 extra attempts). */
const ATTEMPT_PENALTY_PER = 2;
const ATTEMPT_PENALTY_CAP = 20;

/** +10 if solved in under half the suggested time. */
const TIME_BONUS = 10;
/** −10 if solved over the suggested time. */
const TIME_PENALTY = 10;

/**
 * Compute a 0–100 score for a completed challenge — the "standard"
 * formula. Pure and deterministic so it can be unit-tested and called
 * identically from the submit endpoint and any preview UI.
 *
 *   base 100
 *   − sum(penaltyPoints) for each revealed hint
 *   − 2 per attempt after the first (cap −20)
 *   + 10 if timeTaken < timeLimit/2
 *   − 10 if timeTaken > timeLimit
 *
 * Result is clamped to [0, 100].
 */
export function computeScore(input: ScoreInput): ScoreBreakdown {
  const { challenge, revealedHintLevels, attemptsCount, timeTaken } = input;

  const revealed = new Set(revealedHintLevels);
  const hintPenalty = challenge.hints
    .filter((h) => revealed.has(h.level))
    .reduce((sum, h) => sum + h.penaltyPoints, 0);

  const extraAttempts = Math.max(0, attemptsCount - 1);
  const attemptPenalty = Math.min(
    extraAttempts * ATTEMPT_PENALTY_PER,
    ATTEMPT_PENALTY_CAP
  );

  let timeAdjustment = 0;
  const limit = challenge.meta.timeLimit;
  if (timeTaken !== null && limit > 0) {
    if (timeTaken < limit / 2) timeAdjustment = TIME_BONUS;
    else if (timeTaken > limit) timeAdjustment = -TIME_PENALTY;
  }

  const raw = BASE - hintPenalty - attemptPenalty + timeAdjustment;
  const score = Math.max(0, Math.min(100, raw));

  return { score, base: BASE, hintPenalty, attemptPenalty, timeAdjustment };
}
