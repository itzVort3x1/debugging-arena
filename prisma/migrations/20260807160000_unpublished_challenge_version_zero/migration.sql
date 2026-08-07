-- An unpublished challenge sits at version 0.
--
-- Creating a challenge used to write a ChallengeVersion snapshot for the draft
-- and start it at version 1, so the first *published* version came out as 2 --
-- and the history panel, which documents itself as published history, listed a
-- row for content no user could ever have seen.
--
-- Drafts no longer write a version row. Version 0 means nothing has been
-- published, and the first publish increments it to 1, so a challenge's version
-- numbering starts where its history does.
--
-- Default only. No existing row is touched: every challenge in the table is
-- PUBLISHED at version >= 1, and this changes what a future INSERT gets when it
-- omits the column, not what is already stored.

-- AlterTable
ALTER TABLE "Challenge" ALTER COLUMN "version" SET DEFAULT 0;
