-- Drop the deprecated DebugSession.solutionRevealed column.
--
-- The solution reveal became shared per (user, challenge) in the
-- add_shared_reveals migration, which moved this column's data into
-- UserChallengeProgress. It has been a write-only shim since (nothing reads
-- it), so it is now safe to drop. This is the "contract" step of the
-- expand/contract, run only after the shared-reveals code is live in prod.
ALTER TABLE "DebugSession" DROP COLUMN "solutionRevealed";
