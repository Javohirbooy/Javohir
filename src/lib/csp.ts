/**
 * Edge-safe CSP helpers (Web Crypto only). Nonce must match `x-nonce` request header.
 * @see https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
 */

export function generateCspNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function parseSentryConnectOrigin(): string | null {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;
  if (!dsn) return null;
  try {
    const u = new URL(dsn);
    return `https://${u.host}`;
  } catch {
    return null;
  }
}

/** Extra connect-src tokens (Sentry ingest, etc.). */
export function cspConnectSources(): string[] {
  const out: string[] = [];
  const sentry = parseSentryConnectOrigin();
  if (sentry) out.push(sentry);
  // Fallback wildcards for EU/US ingest if DSN not yet in env at edge cold start
  out.push("https://*.ingest.sentry.io", "https://*.ingest.de.sentry.io");
  return out;
}

export function buildContentSecurityPolicy(nonce: string, isDev: boolean): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(isDev ? ["'unsafe-eval'" as const] : []),
  ].join(" ");

  /**
   * Next.js / React / Tailwind va ba’zi kutubxonalar inline `<style>` yuboradi.
   * `style-src` uchun faqat `nonce` yetarli emas — brauzer konsoli ogohlantirishlari chiqadi.
   * Skriptlar `nonce` + `strict-dynamic` bilan qat’iy qoladi.
   */
  const styleSrc = ["'self'", "'unsafe-inline'", ...(isDev ? [] : [`'nonce-${nonce}'`])].join(" ");

  const connectSrc = ["'self'", ...cspConnectSources()].join(" ");

  const parts = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];

  return parts.join("; ").replace(/\s+/g, " ").trim();
}

export function applyCspNonceToRequestHeaders(headers: Headers, nonce: string): Headers {
  const next = new Headers(headers);
  next.set("x-nonce", nonce);
  return next;
}
