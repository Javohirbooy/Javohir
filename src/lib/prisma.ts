import { PrismaClient } from "@prisma/client";
import { getTunedDatabaseUrl } from "@/lib/prisma-database-url";

/**
 * Namespaced singleton — avoids `globalThis.prisma` collisions with other libs/tutorials
 * and ensures dev HMR does not accidentally reuse a foreign Prisma instance.
 *
 * Neon: `DATABASE_URL` pooled (`pgbouncer=true`), `DIRECT_URL` — migrate/db push.
 * Build vaqti: `getTunedDatabaseUrl` pool parametrlarini yumshoq qiladi (SSG parallel).
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

  const tunedUrl = getTunedDatabaseUrl(process.env.DATABASE_URL) ?? process.env.DATABASE_URL;

  return new PrismaClient({
    datasources: {
      db: { url: tunedUrl },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getPrisma(): PrismaClient {
  const existing = globalForPrisma.__IQ_MONITORING_PRISMA__;
  if (existing) return existing;
  const client = createClient();
  globalForPrisma.__IQ_MONITORING_PRISMA__ = client;
  return client;
}

/**
 * Lazy singleton: modul importida `PrismaClient` yaratilmaydi (Next.js build / Vercelda
 * `DATABASE_URL` ba’zan faqat runtime’da bo‘ladi). Birinchi `prisma.*` chaqiruvida ulanadi.
 * Ishlab chiqarishda `DATABASE_URL` baribir Vercel Environment Variables da bo‘lishi kerak.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
