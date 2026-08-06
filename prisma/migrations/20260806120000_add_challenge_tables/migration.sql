-- Challenge content in Postgres (see POSTGRES_CHALLENGES_PLAN.md).
--
-- Challenge definitions move from the repo's `challenges/` tree to the database
-- so they can be authored through the admin UI without a redeploy. `Challenge`
-- holds the raw file tree as jsonb plus a meta projection (columns, so listings
-- filter in SQL and the registry index is one query); `ChallengeVersion` keeps
-- an immutable snapshot per publish, replacing the history and rollback that
-- git used to provide.
--
-- PURELY ADDITIVE. No existing table is touched and no existing row is read or
-- rewritten, so this is safe to apply to a live database and trivially
-- reversible (drop both tables). In particular there is deliberately NO foreign
-- key from DebugSession/HintRequest/UserChallengeProgress.challengeSlug onto
-- Challenge.slug yet: those tables hold production rows that may reference
-- slugs no longer present, which would make the constraint fail to apply. That
-- FK lands in its own migration once the import is verified against real data.

-- ---------------------------------------------------------------------------
-- 1. Challenge: current state of every challenge (draft and published).
-- ---------------------------------------------------------------------------
CREATE TABLE "Challenge" (
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "tags" TEXT[],
    "timeLimit" INTEGER NOT NULL,
    "stack" TEXT[],
    "issueContext" TEXT NOT NULL,
    "languages" TEXT[],
    "defaultLanguage" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("slug")
);

-- The app only ever reads published challenges; drafts are admin-only.
CREATE INDEX "Challenge_status_idx" ON "Challenge"("status");

-- ---------------------------------------------------------------------------
-- 2. ChallengeVersion: immutable snapshot per publish (history + restore).
-- ---------------------------------------------------------------------------
CREATE TABLE "ChallengeVersion" (
    "id" TEXT NOT NULL,
    "challengeSlug" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "meta" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "note" TEXT,

    CONSTRAINT "ChallengeVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChallengeVersion_challengeSlug_version_key" ON "ChallengeVersion"("challengeSlug", "version");

ALTER TABLE "ChallengeVersion" ADD CONSTRAINT "ChallengeVersion_challengeSlug_fkey" FOREIGN KEY ("challengeSlug") REFERENCES "Challenge"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
