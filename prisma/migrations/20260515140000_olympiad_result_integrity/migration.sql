-- Audit-grade submission integrity (server-only HMAC material)
ALTER TABLE "OlympiadResult" ADD COLUMN "submissionCanonicalSha256" TEXT;
ALTER TABLE "OlympiadResult" ADD COLUMN "submissionIntegritySig" TEXT;
