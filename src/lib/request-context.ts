import { headers } from "next/headers";
import { getClientIpFromHeadersGetter } from "@/lib/client-ip";

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
  return getClientIpFromHeadersGetter((name) => h.get(name));
}
