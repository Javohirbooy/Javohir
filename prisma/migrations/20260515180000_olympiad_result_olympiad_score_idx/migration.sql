-- Speed up admin result lists and exports: filter by olympiadId + order by score
CREATE INDEX IF NOT EXISTS "OlympiadResult_olympiadId_score_idx" ON "OlympiadResult" ("olympiadId", "score" DESC);
