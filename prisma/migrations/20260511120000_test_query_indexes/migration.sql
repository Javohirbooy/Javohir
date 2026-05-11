-- Savollar: test bo‘yicha tartiblangan yuklash (SSG / runner).
CREATE INDEX IF NOT EXISTS "Question_testId_order_idx" ON "Question"("testId", "order");

-- Urinish: o‘quvchi + test + status + vaqt bo‘yicha so‘nggi IN_PROGRESS qidiruv.
CREATE INDEX IF NOT EXISTS "TestAttempt_userId_testId_status_startedAt_idx" ON "TestAttempt"("userId", "testId", "status", "startedAt");
