/**
 * Docker / process startup: minimal majburiy o‘zgaruvchilar.
 * NODE_ENV=production da qat’iyroq.
 */
const db = process.env.DATABASE_URL?.trim();
const auth = process.env.AUTH_SECRET ?? "";
const nodeEnv = process.env.NODE_ENV ?? "development";

if (!db) {
  console.error("[check-env] DATABASE_URL majburiy.");
  process.exit(1);
}

if (nodeEnv === "production" && auth.length < 32) {
  console.error("[check-env] Production: AUTH_SECRET kamida 32 belgi bo‘lishi kerak.");
  process.exit(1);
}

process.exit(0);
