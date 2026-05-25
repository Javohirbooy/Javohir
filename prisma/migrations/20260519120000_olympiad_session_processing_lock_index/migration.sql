-- Watchdog: stale processingLock cleanup queries
CREATE INDEX IF NOT EXISTS "OlympiadSession_status_processingStartedAt_idx"
  ON "OlympiadSession" ("status", "processingStartedAt")
  WHERE "processingLock" IS NOT NULL;
