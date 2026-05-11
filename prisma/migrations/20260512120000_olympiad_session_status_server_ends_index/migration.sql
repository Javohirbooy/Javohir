-- Worker: overdue finalization scans (status + serverEndsAt)
CREATE INDEX IF NOT EXISTS "OlympiadSession_status_serverEndsAt_idx" ON "OlympiadSession" ("status", "serverEndsAt");
