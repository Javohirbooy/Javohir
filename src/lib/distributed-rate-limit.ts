import { Ratelimit } from "@upstash/ratelimit";
import type { Duration } from "@upstash/ratelimit";
import { checkRateLimit } from "@/lib/rate-limit";
import { logStructured } from "@/lib/logger";
import { logSecurityEvent } from "@/lib/security-events";
import { getUpstashRedis } from "@/lib/upstash-redis";

const ratelimitCache = new Map<string, Ratelimit>();
const isBuildPhase = () => process.env.NEXT_PHASE === "phase-production-build";

/** Upstash `slidingWindow` uchun `Duration` (masalan `"15 m"`, `"90 s"`). */
export function windowMsToRatelimitDuration(windowMs: number): Duration {
  if (windowMs >= 3_600_000 && windowMs % 3_600_000 === 0) {
    return `${windowMs / 3_600_000} h` as Duration;
  }
  if (windowMs >= 60_000 && windowMs % 60_000 === 0) {
    return `${windowMs / 60_000} m` as Duration;
  }
  if (windowMs >= 1000 && windowMs % 1000 === 0) {
    return `${windowMs / 1000} s` as Duration;
  }
  return `${Math.max(1, Math.ceil(windowMs / 1000))} s` as Duration;
}

function ratelimitKey(namespace: string, limit: number, windowMs: number) {
  return `${namespace}:${limit}:${windowMs}`;
}

function getRatelimit(namespace: string, limit: number, windowMs: number): Ratelimit | null {
  // Build/prerender bosqichida Upstash fetch ishlatmaymiz (DYNAMIC_SERVER_USAGE oldini oladi).
  if (isBuildPhase()) return null;
  const redis = getUpstashRedis();
  if (!redis) return null;
  const ck = ratelimitKey(namespace, limit, windowMs);
  let rl = ratelimitCache.get(ck);
  if (!rl) {
    const duration = windowMsToRatelimitDuration(windowMs);
    const safeNs = namespace.replace(/[^a-zA-Z0-9_-]/g, "_");
    rl = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, duration),
      prefix: `iq:rl:${safeNs}`,
      analytics: false,
    });
    ratelimitCache.set(ck, rl);
  }
  return rl;
}

export type RateLimitResult = {
  ok: boolean;
  retryAfterMs: number;
  remaining: number;
  backend: "redis" | "memory" | "redis_unavailable";
};

/**
 * Token bucket / sliding window (Upstash) yoki xotira fallback.
 * `identifier` — IP, user id yoki scope:ip qatori (qisqa tuting).
 */
export async function takeRateLimitSlot(
  namespace: string,
  identifier: string,
  limit: number,
  windowMs: number,
  options?: { requireDistributed?: boolean; requestId?: string },
): Promise<RateLimitResult> {
  const safeId = identifier.length > 200 ? identifier.slice(0, 200) : identifier;
  const compositeKey = `${namespace}:${safeId}`;

  const rl = getRatelimit(namespace, limit, windowMs);
  if (rl) {
    try {
      const { success, reset, remaining } = await rl.limit(safeId);
      const retryAfterMs = success ? 0 : Math.max(0, reset - Date.now());
      return {
        ok: success,
        retryAfterMs,
        remaining: typeof remaining === "number" ? remaining : 0,
        backend: "redis",
      };
    } catch (e) {
      logStructured("warn", "rate_limit.redis_error", {
        namespace,
        requireDistributed: Boolean(options?.requireDistributed),
        requestId: options?.requestId,
      });
      logSecurityEvent("redis_down", { namespace, requestId: options?.requestId });
      console.error("[rate-limit] Upstash error", e);
    }
  }

  if (options?.requireDistributed) {
    logStructured("warn", "rate_limit.redis_unavailable", {
      namespace,
      requestId: options.requestId,
    });
    logSecurityEvent("redis_down", { namespace, requestId: options.requestId });
    return {
      ok: false,
      retryAfterMs: 2000,
      remaining: 0,
      backend: "redis_unavailable",
    };
  }

  const mem = checkRateLimit(compositeKey, limit, windowMs);
  if (!rl) {
    logStructured("warn", "rate_limit.memory_fallback", {
      namespace,
      requestId: options?.requestId,
    });
    logSecurityEvent("rate_limit_fallback", { namespace, requestId: options?.requestId });
  }
  return {
    ok: mem.ok,
    retryAfterMs: mem.retryAfterMs,
    remaining: mem.ok ? Math.max(0, limit - 1) : 0,
    backend: "memory",
  };
}
