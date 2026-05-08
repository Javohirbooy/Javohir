import { takeRateLimitSlot } from "@/lib/distributed-rate-limit";
import { getClientIpFromHeaders, getRequestIdFromHeaders } from "@/lib/request-context";

/** Server actionlarda IP + scope bo‘yicha throttling (Upstash yoki xotira). */
export async function throttleServerAction(
  scope: string,
  limit: number,
  windowMs: number,
  options?: { requireDistributed?: boolean },
): Promise<{ ok: true } | { ok: false; message: string; retryAfterMs?: number }> {
  const [ip, requestId] = await Promise.all([getClientIpFromHeaders(), getRequestIdFromHeaders()]);
  const r = await takeRateLimitSlot(`sa_${scope}`, ip, limit, windowMs, {
    requireDistributed: options?.requireDistributed,
    requestId,
  });
  if (!r.ok) {
    const protectedModeMessage =
      r.backend === "redis_unavailable"
        ? "Tizim hozircha himoya rejimida. Iltimos, birozdan keyin qayta urinib ko'ring."
        : "Juda ko'p so'rov. Iltimos, birozdan keyin qayta urinib ko'ring.";
    return {
      ok: false,
      message: protectedModeMessage,
      retryAfterMs: r.retryAfterMs,
    };
  }
  return { ok: true };
}
