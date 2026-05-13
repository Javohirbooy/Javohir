-- Admin filterlar va auth yo‘nalishidagi qidiruvlar uchun (login email unique bilan qoplangan).
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");

CREATE INDEX IF NOT EXISTS "User_status_idx" ON "User"("status");
