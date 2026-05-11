import type { ErrorEvent } from "@sentry/core";

const SENSITIVE_HEADERS = new Set(["cookie", "authorization", "x-api-key", "x-vercel-signature"]);

/**
 * PII va maxfiy sarlavhalarni olib tashlash — production log / Sentry eksportlari uchun.
 */
const URL_SECRET_PARAMS = ["password", "token", "secret", "access_token", "refresh_token", "code", "client_secret"];

export function sentryBeforeSend(event: ErrorEvent): ErrorEvent | null {
  const req = event.request;
  if (req?.url && typeof req.url === "string") {
    try {
      const u = new URL(req.url);
      for (const p of URL_SECRET_PARAMS) u.searchParams.delete(p);
      (req as { url?: string }).url = u.toString();
    } catch {
      /* ignore */
    }
  }
  if (req?.headers && typeof req.headers === "object") {
    const headers = { ...(req.headers as Record<string, string | string[] | undefined>) };
    for (const key of Object.keys(headers)) {
      if (SENSITIVE_HEADERS.has(key.toLowerCase())) delete headers[key];
    }
    (req as { headers: Record<string, string | string[] | undefined> }).headers = headers;
  }
  if (req && "cookies" in (req as object)) {
    delete (req as { cookies?: unknown }).cookies;
  }
  if (event.user && typeof event.user === "object" && "ip_address" in event.user) {
    delete (event.user as { ip_address?: unknown }).ip_address;
  }
  return event;
}
