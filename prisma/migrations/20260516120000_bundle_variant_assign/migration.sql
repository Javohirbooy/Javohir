-- Har bir paket ishtirokchisi uchun qaysi olimpiada (variant) ko‘rinishi
ALTER TABLE "OlympiadBundleParticipant" ADD COLUMN "assignedOlympiadIdsJson" TEXT NOT NULL DEFAULT '[]';
