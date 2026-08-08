-- Foreign keys from challengeSlug to Challenge.slug.
--
-- Deferred out of the add_challenge_tables migration on purpose: at the time,
-- `challenges/` was still the source of truth and the Challenge table had only
-- just been populated, so a session pointing at a slug with no row would have
-- made this migration hard-fail against the live database. The import is now
-- verified and the references check out (2026-08-07: 4 distinct session slugs,
-- 0 in HintRequest and UserChallengeProgress, zero orphans across all three),
-- so the constraint can be added.
--
-- NOT NULL-safe and additive: no column changes, no row rewrites. The one way
-- it can fail is a referencing row whose slug has no Challenge — in which case
-- Postgres refuses the whole ALTER and nothing is left half-applied. Find them
-- with, e.g.:
--   SELECT DISTINCT "challengeSlug" FROM "DebugSession"
--   WHERE "challengeSlug" NOT IN (SELECT slug FROM "Challenge");
--
-- ON DELETE RESTRICT, not CASCADE. ChallengeVersion cascades because versions
-- are owned by the challenge; these three are not. They are a user's record of
-- what they did, including scores stamped at submit. Nothing in the app deletes
-- a Challenge (the admin UI unpublishes via `status`; there is no DELETE route),
-- so the only way to reach this rule is a manual database operation — exactly
-- the moment a refusal is worth more than a silent cascade.
--
-- The indexes are not redundant with the existing composite ones: challengeSlug
-- is not their leading column, so it cannot serve the FK's child lookup alone.

-- CreateIndex
CREATE INDEX "DebugSession_challengeSlug_idx" ON "DebugSession"("challengeSlug");

-- CreateIndex
CREATE INDEX "HintRequest_challengeSlug_idx" ON "HintRequest"("challengeSlug");

-- CreateIndex
CREATE INDEX "UserChallengeProgress_challengeSlug_idx" ON "UserChallengeProgress"("challengeSlug");

-- AddForeignKey
ALTER TABLE "DebugSession" ADD CONSTRAINT "DebugSession_challengeSlug_fkey" FOREIGN KEY ("challengeSlug") REFERENCES "Challenge"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HintRequest" ADD CONSTRAINT "HintRequest_challengeSlug_fkey" FOREIGN KEY ("challengeSlug") REFERENCES "Challenge"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserChallengeProgress" ADD CONSTRAINT "UserChallengeProgress_challengeSlug_fkey" FOREIGN KEY ("challengeSlug") REFERENCES "Challenge"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
