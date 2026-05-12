-- Replay protection for signed autosave/submit (atomic via conditional updates)
ALTER TABLE "OlympiadAttempt" ADD COLUMN "autosaveSeq" INTEGER NOT NULL DEFAULT 0;
