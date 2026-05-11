/**
 * Klient IP (rate limit / audit). Faqat ishonchli proksi qatlamida RUXSAT ETILGAN headerlar.
 * Spoofing xavfi: xizmat provayderi (Vercel/Cloudflare) qo‘ygan qiymatlar.
 */

function firstForwardedIp(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first || null;
}

function normalizeIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const trimmed = ip.trim();
  if (!trimmed || trimmed === "unknown") return null;
  return trimmed.slice(0, 128);
}

/**
 * `Headers` yoki `NextRequest.headers` uchun — bir xil tartibda tekshiruv.
 * Vercel: `x-forwarded-for` — mijozning ochiq IP si (hujjatlashtirilgan).
 */
export function getClientIpFromHeadersGetter(get: (name: string) => string | null): string {
  const preferred =
    normalizeIp(get("cf-connecting-ip")) ??
    normalizeIp(get("true-client-ip")) ??
    normalizeIp(get("fastly-client-ip")) ??
    normalizeIp(get("x-real-ip")) ??
    normalizeIp(firstForwardedIp(get("x-forwarded-for")));
  return preferred ?? "unknown";
}
