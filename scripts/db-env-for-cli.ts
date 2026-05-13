/**
 * CLI skriptlari: `.env` + `.env.local`, so‘ng Prisma uchun `DATABASE_URL` ni to‘ldirish
 * (Vercel pull ba’zan faqat POSTGRES_PRISMA_URL qoldiradi).
 */
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const keys = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL", "PRISMA_DATABASE_URL"] as const;
let resolved: string | undefined;
for (const k of keys) {
  const v = process.env[k]?.trim();
  if (v) {
    resolved = v;
    break;
  }
}
if (resolved && !process.env.DATABASE_URL?.trim()) {
  process.env.DATABASE_URL = resolved;
}
if (process.env.DATABASE_URL?.trim() && !process.env.DIRECT_URL?.trim()) {
  process.env.DIRECT_URL = process.env.DATABASE_URL_UNPOOLED?.trim() || process.env.DATABASE_URL.trim();
}
