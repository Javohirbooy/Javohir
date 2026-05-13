import { PrismaClient } from "@prisma/client";
import { getTunedDatabaseUrl } from "@/lib/prisma-database-url";
import { isNextProductionBuildPhase } from "@/lib/redis-strict-policy";

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

/**
 * Build bosqichida bundler marshrut modullarini baholashi uchun — haqiqiy ulanish bo‘lmaydi.
 * Runtime’da DATABASE_URL bo‘lmasa xato beriladi.
 */
const PRISMA_BUILD_STUB_URL =
  "postgresql://127.0.0.1:65534/prisma_build_stub?schema=public&connect_timeout=1";

function createClient(): PrismaClient {
  let databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl && isNextProductionBuildPhase()) {
    databaseUrl = PRISMA_BUILD_STUB_URL;
  }
  if (!databaseUrl) {
    throw new Error(
      [
        "DATABASE_URL o‘rnatilmagan (.env). Neon connection string qo‘shing.",
        "Vercel: Settings → Environment Variables — DATABASE_URL (yoki POSTGRES_PRISMA_URL / NEON_DATABASE_URL) ni Production, Preview va **Build** muhitlari uchun ham ulang (Build uchun yo‘q bo‘lsa `npm run build` xato beradi).",
        "Migratsiya: DIRECT_URL yoki POSTGRES_URL_NON_POOLING.",
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
