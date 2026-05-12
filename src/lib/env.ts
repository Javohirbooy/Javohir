import { isUpstashConfigured } from "@/lib/upstash-redis";
import { mustEnforceDistributedRedisAtStartup } from "@/lib/redis-strict-policy";
import {
  allowInsecureSiteUrl,
  isHttpsUrl,
  parsePublicEnv,
  parseServerSecrets,
} from "@/lib/env-schema";

export { allowInsecureSiteUrl, parsePublicEnv, parseServerSecrets } from "@/lib/env-schema";

/**
 * Canonical / email / OG uchun asosiysi `NEXT_PUBLIC_SITE_URL`.
 * Vercelda odatda `VERCEL_URL` (https) — `NEXT_PUBLIC_SITE_URL` bo‘lmasa shu ishlatiladi.
 */
export function getSiteUrl(): string {
  const parsed = parsePublicEnv();
  const explicit = parsed.ok ? parsed.data.NEXT_PUBLIC_SITE_URL : undefined;
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const withProto = vercel.startsWith("http") ? vercel : `https://${vercel}`;
    try {
      return new URL(withProto).origin;
    } catch {
      /* ignore */
    }
  }
  return "http://localhost:3000";
}

export type ValidateServerEnvResult =
  | { ok: true }
  | {
      ok: false;
      errors: {
        public?: Record<string, string[] | undefined>;
        server?: Record<string, string[] | undefined>;
      };
    };

/** Startup / testlar uchun server env shaklini tekshirish (xatolarni konsolga chiqarmaydi). */
export function validateServerEnv(): ValidateServerEnvResult {
  const pub = parsePublicEnv();
  const sec = parseServerSecrets();
  if (!pub.ok) {
    return { ok: false, errors: { public: pub.errors.flatten().fieldErrors } };
  }
  if (!sec.ok) {
    return { ok: false, errors: { server: sec.errors.flatten().fieldErrors } };
  }
  return { ok: true };
}

/**
 * `instrumentation.ts` (Node production) da chaqiriladi.
 * CI / GitHub Actions: `ALLOW_INSECURE_SITE_URL=1` yoki `GITHUB_ACTIONS=true` — http localhost ruxsat.
 */
export function assertProductionConfig() {
  if (process.env.NODE_ENV !== "production") return;

  const relaxed = allowInsecureSiteUrl();

  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("[env] Production: DATABASE_URL majburiy.");
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("[env] Production: AUTH_SECRET kamida 32 belgi bo‘lishi kerak.");
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const hasVercelUrl = Boolean(process.env.VERCEL_URL?.trim());
  if (!site && !hasVercelUrl && !relaxed) {
    throw new Error(
      "[env] Production: NEXT_PUBLIC_SITE_URL yoki Vercel VERCEL_URL kerak (metadataBase, email, OG).",
    );
  }
  if (!site && !hasVercelUrl && relaxed) {
    console.warn("[env] Production: NEXT_PUBLIC_SITE_URL yo‘q — metadata/email havolalari localhost ga tushishi mumkin.");
  }
  if (site && !isHttpsUrl(site)) {
    if (!relaxed) {
      throw new Error(
        "[env] Production: NEXT_PUBLIC_SITE_URL faqat https:// bo‘lishi kerak. Istisno: ALLOW_INSECURE_SITE_URL=1 yoki CI.",
      );
    }
    console.warn("[env] Production: NEXT_PUBLIC_SITE_URL HTTPS emas — faqat dev/CI rejimi uchun.");
  }

  const authBase = process.env.AUTH_URL?.trim() || process.env.NEXTAUTH_URL?.trim();
  if (authBase && !isHttpsUrl(authBase) && !relaxed) {
    throw new Error(
      "[env] Production: AUTH_URL yoki NEXTAUTH_URL https:// bo‘lishi kerak (session cookie xavfsizligi).",
    );
  }

  if (mustEnforceDistributedRedisAtStartup() && !isUpstashConfigured()) {
    throw new Error(
      "[env] Production: UPSTASH_REDIS_REST_URL va UPSTASH_REDIS_REST_TOKEN majburiy (tarqalgan rate limit / lockout). ALLOW_MEMORY_RATE_LIMIT=1 faqat maxsus dev/test.",
    );
  }

  if (process.env.VERCEL === "1" && !isUpstashConfigured() && !mustEnforceDistributedRedisAtStartup()) {
    console.warn(
      "[env] Vercel: bir nechta funksiya instansiyasi uchun UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN tavsiya etiladi (rate limit / lockout).",
    );
  }

  const pub = parsePublicEnv();
  const sec = parseServerSecrets();
  if (!pub.ok) {
    const fe = pub.errors.flatten().fieldErrors;
    console.error("[env] Production: NEXT_PUBLIC_* sxema xatosi", fe);
    throw new Error("[env] Production: NEXT_PUBLIC_* muhit o‘zgaruvchilari sxemaga mos emas.");
  }
  if (!sec.ok) {
    const fe = sec.errors.flatten().fieldErrors;
    console.error("[env] Production: server env sxema xatosi", fe);
    throw new Error("[env] Production: server-only muhit o‘zgaruvchilari sxemaga mos emas.");
  }
}
