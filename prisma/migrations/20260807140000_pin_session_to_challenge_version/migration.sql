-- Pin a session to the ChallengeVersion it started against.
--
-- Challenges are now authored in the admin UI, so a published edit takes effect
-- immediately. Without a pin that edit lands on anyone mid-session: the
-- description, hints and - worse - the test files can change underneath a run
-- that has already started, and the score is computed against whatever happens
-- to be live at submit rather than what the user was actually given.
--
-- The version is stamped at session creation and content is resolved from that
-- immutable ChallengeVersion snapshot instead of the live Challenge row.
--
-- NULLABLE ON PURPOSE, and it stays that way. Sessions created before this
-- migration have no version to point at; backfilling them with the challenge's
-- current version would assert they were served content they may never have
-- seen. They read through to live content instead, exactly as they do today.
-- MATCH SIMPLE means a NULL in the composite key skips the FK check, so those
-- rows coexist with the constraint rather than needing an exemption.
--
-- ON DELETE RESTRICT: a version somebody is mid-session on cannot be deleted
-- out from under them. Consistent with the challengeSlug FKs added in the
-- previous migration.
--
-- Additive: one nullable column, no rewrite of existing rows.

-- AlterTable
ALTER TABLE "DebugSession" ADD COLUMN     "challengeVersion" INTEGER;

-- AddForeignKey
ALTER TABLE "DebugSession" ADD CONSTRAINT "DebugSession_challengeSlug_challengeVersion_fkey" FOREIGN KEY ("challengeSlug", "challengeVersion") REFERENCES "ChallengeVersion"("challengeSlug", "version") ON DELETE RESTRICT ON UPDATE CASCADE;
