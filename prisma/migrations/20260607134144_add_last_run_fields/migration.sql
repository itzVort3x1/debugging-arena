-- AlterTable
ALTER TABLE "DebugSession" ADD COLUMN "lastRunAt" DATETIME;
ALTER TABLE "DebugSession" ADD COLUMN "lastRunFailed" INTEGER;
ALTER TABLE "DebugSession" ADD COLUMN "lastRunPassed" INTEGER;
ALTER TABLE "DebugSession" ADD COLUMN "lastRunTotal" INTEGER;
