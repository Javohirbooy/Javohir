import { z } from "zod";

/** Faqat `NEXT_PUBLIC_*` — brauzer bundle ga tushishi mumkin bo‘lgan kalitlar (maxfiy qiymatlar qo‘shmang). */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_ENABLE_REGISTRATION: z
    .string()
    .optional()
    .refine((v) => v === undefined || v === "0" || v === "1", "NEXT_PUBLIC_ENABLE_REGISTRATION: 0 yoki 1"),
  NEXT_PUBLIC_AUTH_DEBUG: z
    .string()
    .optional()
    .refine((v) => v === undefined || v === "0" || v === "1", "NEXT_PUBLIC_AUTH_DEBUG: 0 yoki 1"),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_RELEASE: z.string().min(1).max(200).optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function parsePublicEnv(): { ok: true; data: PublicEnv } | { ok: false; errors: z.ZodError } {
  const r = publicEnvSchema.safeParse(process.env);
  if (!r.success) return { ok: false, errors: r.error };
  return { ok: true, data: r.data };
}

/** Server-only (hech qachon `NEXT_PUBLIC_` prefiksisiz clientga chiqmasin). */
const serverSecretsSchema = z.object({
  AUTH_SECRET: z.string().min(32).optional(),
  NEXTAUTH_SECRET: z.string().min(32).optional(),
  DATABASE_URL: z.string().min(1).optional(),
  DIRECT_URL: z.string().min(1).optional(),
  AUTH_URL: z.string().url().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM: z.string().min(1).optional(),
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
});

export type ServerSecretsShape = z.infer<typeof serverSecretsSchema>;

export function parseServerSecrets(): { ok: true; data: ServerSecretsShape } | { ok: false; errors: z.ZodError } {
  const r = serverSecretsSchema.safeParse(process.env);
  if (!r.success) return { ok: false, errors: r.error };
  return { ok: true, data: r.data };
}

export function allowInsecureSiteUrl(): boolean {
  return (
    process.env.ALLOW_INSECURE_SITE_URL === "1" ||
    process.env.GITHUB_ACTIONS === "true" ||
    process.env.SKIP_PRODUCTION_HTTPS_ENFORCEMENT === "1"
  );
}

export function isHttpsUrl(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}
