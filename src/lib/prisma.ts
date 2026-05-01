import { PrismaClient } from "@prisma/client";

/**
 * Namespaced singleton — avoids `globalThis.prisma` collisions with other libs/tutorials
 * and ensures dev HMR does not accidentally reuse a foreign Prisma instance.
 *
 * Neon: `DATABASE_URL` pooled (`pgbouncer=true`), `DIRECT_URL` — migrate/db push.
 * If queries fail with “Unknown argument …”, run `npx prisma generate` va dev serverni qayta ishga tushiring.
 */
const globalForPrisma = globalThis as typeof globalThis & {
  __IQ_MONITORING_PRISMA__?: PrismaClient;
};

function createClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL o‘rnatilmagan (.env). Neon connection string qo‘shing.");
  }
  /** Vercelda ba’zan faqat bitta URL qo‘yiladi; `schema.prisma` `directUrl` talab qiladi. */
  if (!process.env.DIRECT_URL) {
    process.env.DIRECT_URL = process.env.DATABASE_URL;
  }
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/** Barcha muhitlarda bitta instansiya — Neon pooled ulanishlarni ortiqcha ochishni kamaytiradi. */
export const prisma =
  globalForPrisma.__IQ_MONITORING_PRISMA__ ??
  (globalForPrisma.__IQ_MONITORING_PRISMA__ = createClient());
