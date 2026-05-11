-- Finalization metadata + worker lease (idempotent yakunlash, admin ko‘rinishi)
ALTER TABLE "OlympiadSession" ADD COLUMN IF NOT EXISTS "finalizedAt" TIMESTAMP(3);
ALTER TABLE "OlympiadSession" ADD COLUMN IF NOT EXISTS "finalizationReason" TEXT;
ALTER TABLE "OlympiadSession" ADD COLUMN IF NOT EXISTS "autoFinalized" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OlympiadSession" ADD COLUMN IF NOT EXISTS "processingLock" TEXT;
ALTER TABLE "OlympiadSession" ADD COLUMN IF NOT EXISTS "processingStartedAt" TIMESTAMP(3);

ALTER TABLE "OlympiadResult" ADD COLUMN IF NOT EXISTS "finalizedAt" TIMESTAMP(3);
ALTER TABLE "OlympiadResult" ADD COLUMN IF NOT EXISTS "finalizationReason" TEXT;
ALTER TABLE "OlympiadResult" ADD COLUMN IF NOT EXISTS "autoFinalized" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "OlympiadSession_olympiadId_autoFinalized_idx" ON "OlympiadSession" ("olympiadId", "autoFinalized");
CREATE INDEX IF NOT EXISTS "OlympiadSession_olympiadId_finalizationReason_idx" ON "OlympiadSession" ("olympiadId", "finalizationReason");
CREATE INDEX IF NOT EXISTS "OlympiadResult_olympiadId_autoFinalized_idx" ON "OlympiadResult" ("olympiadId", "autoFinalized");
