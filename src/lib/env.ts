import { z } from "zod";
import { isUpstashConfigured } from "@/lib/upstash-redis";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
});

const serverEnvSchema = z.object({
  AUTH_SECRET: z.string().min(16).optional(),
  DATABASE_URL: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM: z.string().min(1).optional(),
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
});

export function getSiteUrl() {
  const parsed = publicEnvSchema.safeParse(process.env);
  const raw = parsed.success ? parsed.data.NEXT_PUBLIC_SITE_URL : undefined;
  return raw ?? "http://localhost:3000";
}

export function validateServerEnv() {
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    return {
      ok: false as const,
      errors: parsed.error.flatten().fieldErrors,
    };
  }
  return { ok: true as const };
}

/**
 * Ishga tushishda chaqiriladi (`instrumentation.ts`). Productionda majburiy o‘zgaruvchilarni tekshiradi.
 */
export function assertProductionConfig() {
  if (process.env.NODE_ENV !== "production") return;

  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("[env] Production: DATABASE_URL majburiy.");
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("[env] Production: AUTH_SECRET kamida 32 belgi bo‘lishi kerak.");
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site || !/^https:\/\//i.test(site)) {
    console.warn("[env] Production: NEXT_PUBLIC_SITE_URL HTTPS URL bo‘lishi tavsiya etiladi (email havolalari uchun).");
  }

  if (process.env.VERCEL && !isUpstashConfigured()) {
    console.warn(
      "[env] Vercel: bir nechta funksiya instansiyasi uchun UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN tavsiya etiladi (rate limit / lockout).",
    );
  }
}
