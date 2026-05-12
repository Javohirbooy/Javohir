-- OlympiadCertificate: public verification, revocation, PDF metadata
ALTER TABLE "OlympiadCertificate" ADD COLUMN IF NOT EXISTS "verifyPublicId" TEXT;
ALTER TABLE "OlympiadCertificate" ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3);
ALTER TABLE "OlympiadCertificate" ADD COLUMN IF NOT EXISTS "revokeReason" TEXT;
ALTER TABLE "OlympiadCertificate" ADD COLUMN IF NOT EXISTS "pdfUrl" TEXT;
ALTER TABLE "OlympiadCertificate" ADD COLUMN IF NOT EXISTS "medal" TEXT;
ALTER TABLE "OlympiadCertificate" ADD COLUMN IF NOT EXISTS "contentSha256" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "OlympiadCertificate_verifyPublicId_key" ON "OlympiadCertificate"("verifyPublicId");
