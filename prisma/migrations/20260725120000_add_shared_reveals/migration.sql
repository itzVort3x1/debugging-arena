-- Shared hint + solution reveals (per user+challenge, language-independent).
--
-- Before: HintRequest was keyed per session (@@unique([sessionId, level])) and
-- the solution reveal lived on DebugSession.solutionRevealed. Both are now
-- shared across every language/session for a given (user, challenge):
--   * HintRequest is repointed onto (userId, challengeSlug, level).
--   * A new UserChallengeProgress row holds solutionRevealed.
-- Existing rows are backfilled from their sessions and deduped so the new
-- unique keys hold. All challenges are single-language in prod today, so this
-- is behavior-preserving: shared == per-session when there is one language.

-- ---------------------------------------------------------------------------
-- 1. UserChallengeProgress: shared solution-reveal state.
-- ---------------------------------------------------------------------------
CREATE TABLE "UserChallengeProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeSlug" TEXT NOT NULL,
    "solutionRevealed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserChallengeProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserChallengeProgress_userId_challengeSlug_key" ON "UserChallengeProgress"("userId", "challengeSlug");

ALTER TABLE "UserChallengeProgress" ADD CONSTRAINT "UserChallengeProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: any session that revealed the solution seeds the shared record.
-- DISTINCT collapses multiple revealed sessions (e.g. across languages) into
-- one idempotent row per (user, challenge).
INSERT INTO "UserChallengeProgress" ("id", "userId", "challengeSlug", "solutionRevealed", "updatedAt")
SELECT gen_random_uuid()::text, s."userId", s."challengeSlug", true, now()
FROM (
    SELECT DISTINCT "userId", "challengeSlug"
    FROM "DebugSession"
    WHERE "solutionRevealed" = true
) AS s;

-- ---------------------------------------------------------------------------
-- 2. HintRequest: repoint onto (userId, challengeSlug, level).
-- ---------------------------------------------------------------------------

-- 2a. Add the new key columns nullable so we can backfill in place.
ALTER TABLE "HintRequest" ADD COLUMN "userId" TEXT;
ALTER TABLE "HintRequest" ADD COLUMN "challengeSlug" TEXT;

-- 2b. Backfill user + challenge from the owning session.
UPDATE "HintRequest" hr
SET "userId" = ds."userId",
    "challengeSlug" = ds."challengeSlug"
FROM "DebugSession" ds
WHERE hr."sessionId" = ds."id";

-- 2c. Dedupe: a hint level is now shared per (user, challenge), so collapse
-- duplicate reveals (same level from different sessions/languages), keeping
-- the earliest reveal. Ties on requestedAt break on id for determinism.
DELETE FROM "HintRequest" a
USING "HintRequest" b
WHERE a."userId" = b."userId"
  AND a."challengeSlug" = b."challengeSlug"
  AND a."level" = b."level"
  AND (
      a."requestedAt" > b."requestedAt"
      OR (a."requestedAt" = b."requestedAt" AND a."id" > b."id")
  );

-- 2d. Drop the old per-session unique index and FK.
DROP INDEX "HintRequest_sessionId_level_key";
ALTER TABLE "HintRequest" DROP CONSTRAINT "HintRequest_sessionId_fkey";

-- 2e. sessionId becomes optional audit metadata (survives session deletion).
ALTER TABLE "HintRequest" ALTER COLUMN "sessionId" DROP NOT NULL;

-- 2f. Every row is backfilled now, so enforce non-null on the new key columns.
ALTER TABLE "HintRequest" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "HintRequest" ALTER COLUMN "challengeSlug" SET NOT NULL;

-- 2g. New shared unique key + re-add FKs (userId cascades, sessionId SET NULL).
CREATE UNIQUE INDEX "HintRequest_userId_challengeSlug_level_key" ON "HintRequest"("userId", "challengeSlug", "level");
ALTER TABLE "HintRequest" ADD CONSTRAINT "HintRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HintRequest" ADD CONSTRAINT "HintRequest_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DebugSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
