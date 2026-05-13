import { PrismaClient } from "@prisma/client";
import { getTunedDatabaseUrl } from "@/lib/prisma-database-url";

/**
 * Vercel + Neon integratsiyasi ba’zan `POSTGRES_PRISMA_URL` kabi nom bilan beradi.
 * Prisma `schema.prisma` asosan `DATABASE_URL` ni kutadi — bu yerda birinchi topilganini ishlatamiz.
 */
function resolveDatabaseUrl(): string | undefined {
  const keys = [
    "DATABASE_URL",
    "POSTGRES_PRISMA_URL",
    "POSTGRES_URL",
    "PRISMA_DATABASE_URL",
    "NEON_DATABASE_URL",
    "STORAGE_DATABASE_URL",
  ] as const;
  for (const k of keys) {
    const v = process.env[k]?.trim();
    if (v) return v;
  }
  return undefined;
}

/** `/api/health` va startup — maxfiy URL chiqarmaydi. */
export function isDatabaseConfigured(): boolean {
  return Boolean(resolveDatabaseUrl());
}

function resolveDirectUrl(pooledUrl: string): string {
  const explicit = process.env.DIRECT_URL?.trim();
  if (explicit) return explicit;
  const unpooled =
    process.env.DATABASE_URL_UNPOOLED?.trim() || process.env.POSTGRES_URL_NON_POOLING?.trim();
  if (unpooled) return unpooled;
  return pooledUrl;
}

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
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    throw new Error(
      [
        "PostgreSQL ulanishi topilmadi.",
        "Vercel: loyiha → Settings → Environment Variables — quyidagilardan kamida bittasini Production (va kerak bo‘lsa Preview) uchun qo‘shing:",
        "DATABASE_URL (tavsiya), yoki Neon/Vercel Postgres bergan POSTGRES_PRISMA_URL / POSTGRES_URL / NEON_DATABASE_URL.",
        "Neon: Vercel → Storage → database ulanishi — odatda `DATABASE_URL` avtomatik yoziladi.",
        "Migratsiya uchun ixtiyoriy: DIRECT_URL yoki DATABASE_URL_UNPOOLED (Neon to‘g‘ri ulanish).",
      ].join(" "),
    );
  }
  /** Boshqa kod `process.env.DATABASE_URL` ni kutishi mumkin (masalan, migratsiya CLI). */
  if (!process.env.DATABASE_URL?.trim()) {
    process.env.DATABASE_URL = databaseUrl;
  }
  /** Vercelda ba’zan faqat bitta URL qo‘yiladi; `schema.prisma` `directUrl` talab qiladi. */
  if (!process.env.DIRECT_URL?.trim()) {
    process.env.DIRECT_URL = resolveDirectUrl(databaseUrl);
  }

  const tunedUrl = getTunedDatabaseUrl(databaseUrl) ?? databaseUrl;

  const debugQueries = process.env.PRISMA_DEBUG_QUERIES === "1";
  return new PrismaClient({
    datasources: {
      db: { url: tunedUrl },
    },
    log:
      debugQueries ? (["query", "error", "warn"] as const) : process.env.NODE_ENV === "development"
        ? (["error", "warn"] as const)
        : (["error"] as const),
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
 * Ishlab chiqarishda PostgreSQL ulanishi (DATABASE_URL yoki POSTGRES_* muhit o‘zgaruvchilari) Vercelda bo‘lishi kerak.
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
