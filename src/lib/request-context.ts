import { headers } from "next/headers";

function firstForwardedIp(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  if (!first) return null;
  return first;
}

function normalizeIp(ip: string | null): string | null {
  if (!ip) return null;
  const trimmed = ip.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 128);
}

export async function getRequestIdFromHeaders(): Promise<string | undefined> {
  const h = await headers();
  return h.get("x-request-id") ?? undefined;
}

/**
 * Vercel/Edge-safe client IP extraction.
 * Prefer provider-set headers before generic forwarded values.
 */
export async function getClientIpFromHeaders(): Promise<string> {
  const h = await headers();
  const preferred =
    normalizeIp(h.get("cf-connecting-ip")) ??
    normalizeIp(h.get("x-real-ip")) ??
    normalizeIp(firstForwardedIp(h.get("x-forwarded-for")));
  return preferred ?? "unknown";
}
