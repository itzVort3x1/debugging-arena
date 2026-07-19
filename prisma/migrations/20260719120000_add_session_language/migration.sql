-- AlterTable
ALTER TABLE "DebugSession" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'node';

-- Backfill existing rows' language from their challenge's runtime. All current
-- challenges are single-language node except python-discount-bug; new rows get
-- their language set explicitly by the app at session-create time. Without this,
-- pre-existing in-progress python sessions wouldn't resume (their default 'node'
-- wouldn't match a 'python' resume request).
UPDATE "DebugSession" SET "language" = 'python' WHERE "challengeSlug" = 'python-discount-bug';

-- DropIndex
DROP INDEX "DebugSession_userId_challengeSlug_idx";

-- CreateIndex
CREATE INDEX "DebugSession_userId_challengeSlug_language_idx" ON "DebugSession"("userId", "challengeSlug", "language");
