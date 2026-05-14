-- Stale SUBMITTING repair worker: WHERE status = 'SUBMITTING' AND lastSeenAt < cutoff
CREATE INDEX IF NOT EXISTS "OlympiadSession_status_lastSeenAt_idx" ON "OlympiadSession" ("status", "lastSeenAt");
