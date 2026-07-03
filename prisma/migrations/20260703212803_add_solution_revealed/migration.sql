/*
  Warnings:

  - A unique constraint covering the columns `[sessionId,level]` on the table `HintRequest` will be added. If there are existing duplicate values, this will fail.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DebugSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "challengeSlug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "attemptsCount" INTEGER NOT NULL DEFAULT 0,
    "timeTaken" INTEGER,
    "score" INTEGER,
    "solutionRevealed" BOOLEAN NOT NULL DEFAULT false,
    "fileState" TEXT NOT NULL DEFAULT '{}',
    "lastRunPassed" INTEGER,
    "lastRunFailed" INTEGER,
    "lastRunTotal" INTEGER,
    "lastRunAt" DATETIME,
    CONSTRAINT "DebugSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DebugSession" ("attemptsCount", "challengeSlug", "completedAt", "fileState", "hintsUsed", "id", "lastRunAt", "lastRunFailed", "lastRunPassed", "lastRunTotal", "score", "startedAt", "status", "timeTaken", "userId") SELECT "attemptsCount", "challengeSlug", "completedAt", "fileState", "hintsUsed", "id", "lastRunAt", "lastRunFailed", "lastRunPassed", "lastRunTotal", "score", "startedAt", "status", "timeTaken", "userId" FROM "DebugSession";
DROP TABLE "DebugSession";
ALTER TABLE "new_DebugSession" RENAME TO "DebugSession";
CREATE INDEX "DebugSession_userId_challengeSlug_idx" ON "DebugSession"("userId", "challengeSlug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "HintRequest_sessionId_level_key" ON "HintRequest"("sessionId", "level");
