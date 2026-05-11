import { sentryBeforeSend } from "@/lib/sentry/before-send";

function parseSampleRate(raw: string | undefined, fallback: number): number {
  if (raw == null || raw === "") return fallback;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(1, n);
}

function resolveDsn(runtime: "server" | "edge" | "browser"): string | undefined {
  if (runtime === "browser") return process.env.NEXT_PUBLIC_SENTRY_DSN;
  return process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
}

function resolveEnvironment(): string {
  return (
    process.env.SENTRY_ENVIRONMENT?.trim() ||
    process.env.VERCEL_ENV?.trim() ||
    process.env.NODE_ENV ||
    "development"
  );
}

function resolveRelease(): string | undefined {
  const r =
    process.env.NEXT_PUBLIC_SENTRY_RELEASE?.trim() ||
    process.env.SENTRY_RELEASE?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim();
  return r || undefined;
}

/**
 * Server / Edge / brauzer — bir xil siyosat (environment, sampling, scrubbing).
 * Brauzerda faqat `NEXT_PUBLIC_SENTRY_DSN` (server-only DSN bundle ga tushmasin).
 */
export function getSharedSentryInitOptions(runtime: "server" | "edge" | "browser") {
  const dsn = resolveDsn(runtime);
  const isProd = process.env.NODE_ENV === "production";
  const tracesSampleRate = parseSampleRate(
    process.env.SENTRY_TRACES_SAMPLE_RATE,
    isProd ? 0.12 : 1,
  );

  return {
    dsn: dsn || undefined,
    enabled: Boolean(dsn),
    environment: resolveEnvironment(),
    release: resolveRelease(),
    sendDefaultPii: false,
    tracesSampleRate,
    ignoreErrors: [
      /^ResizeObserver loop/i,
      /^Non-Error promise rejection captured/i,
      /^AbortError$/i,
      /^Load failed$/i,
    ] as (string | RegExp)[],
    denyUrls: [/extensions\//i, /^chrome:\/\//i, /^moz-extension:\/\//i] as (string | RegExp)[],
    beforeSend: sentryBeforeSend,
  };
}
