-- WHY: Faster grade-partitioned ranking publish + violation lookups by type.
CREATE INDEX IF NOT EXISTS "OlympiadParticipant_olympiadId_gradeLabel_idx" ON "OlympiadParticipant" ("olympiadId", "gradeLabel");

CREATE INDEX IF NOT EXISTS "OlympiadViolation_sessionId_type_idx" ON "OlympiadViolation" ("sessionId", "type");

CREATE INDEX IF NOT EXISTS "OlympiadResult_olympiadId_autoFinalized_score_idx" ON "OlympiadResult" ("olympiadId", "autoFinalized", "score");
