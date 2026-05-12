import { Ratelimit } from "@upstash/ratelimit";
import type { Duration } from "@upstash/ratelimit";
import * as Sentry from "@sentry/nextjs";
import { checkRateLimit } from "@/lib/rate-limit";
import { logStructured } from "@/lib/logger";
import { logSecurityEvent } from "@/lib/security-events";
import { getUpstashRedis } from "@/lib/upstash-redis";
import { isStrictDistributedRateLimitPolicy, isNextProductionBuildPhase } from "@/lib/redis-strict-policy";
import { shipStructuredLog } from "@/lib/log-shipping";

const ratelimitCache = new Map<string, Ratelimit>();
const isBuildPhase = () => process.env.NEXT_PHASE === "phase-production-build";
let disableRedisTemporarily = false;

function isDynamicServerUsageError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { message?: string; digest?: string; description?: string };
  return (
    maybe.digest === "DYNAMIC_SERVER_USAGE" ||
    maybe.message?.includes("Dynamic server usage") === true ||
    maybe.description?.includes("no-store fetch") === true
  );
}

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
  if (isBuildPhase() || disableRedisTemporarily) return null;
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

function failClosedRedisUnavailable(namespace: string, requestId?: string): RateLimitResult {
  logStructured("error", "rate_limit.fail_closed_redis_unavailable", { namespace, requestId });
  logSecurityEvent("redis_down", { namespace, requestId, mode: "fail_closed" });
  void shipStructuredLog("rate_limit.fail_closed", { namespace, requestId: requestId ?? "" });
  Sentry.captureMessage("Distributed Redis required but unavailable (fail-closed rate limit)", {
    level: "error",
    tags: { component: "rate_limit", namespace },
    extra: { requestId },
  });
  return {
    ok: false,
    retryAfterMs: 60_000,
    remaining: 0,
    backend: "redis_unavailable",
  };
}

/**
 * Token bucket / sliding window (Upstash) yoki xotira fallback (faqat qat’iy siyosat yo‘qida).
 * `requireDistributed: true` + production strict → Redis yo‘q yoki xato bo‘lsa **fail closed** (xotira emas).
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
  const strict = isStrictDistributedRateLimitPolicy();
  const requireDist = Boolean(options?.requireDistributed);

  if (requireDist && strict && !getUpstashRedis()) {
    return failClosedRedisUnavailable(namespace, options?.requestId);
  }

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
      if (isDynamicServerUsageError(e)) {
        disableRedisTemporarily = true;
        logStructured("warn", "rate_limit.redis_disabled_dynamic_context", {
          namespace,
          requestId: options?.requestId,
        });
        if (requireDist && strict && !isNextProductionBuildPhase()) {
          return failClosedRedisUnavailable(namespace, options?.requestId);
        }
        const mem = checkRateLimit(compositeKey, limit, windowMs);
        return {
          ok: mem.ok,
          retryAfterMs: mem.retryAfterMs,
          remaining: mem.ok ? Math.max(0, limit - 1) : 0,
          backend: "memory",
        };
      }
      logStructured("warn", "rate_limit.redis_error", {
        namespace,
        requireDistributed: requireDist,
        requestId: options?.requestId,
      });
      logSecurityEvent("redis_down", { namespace, requestId: options?.requestId });
      console.error("[rate-limit] Upstash error", e);
      if (requireDist && strict) {
        Sentry.captureException(e, { tags: { component: "rate_limit", namespace } });
        return failClosedRedisUnavailable(namespace, options?.requestId);
      }
    }
  }

  if (requireDist && strict && !rl) {
    return failClosedRedisUnavailable(namespace, options?.requestId);
  }

  const mem = checkRateLimit(compositeKey, limit, windowMs);
  if (!rl) {
    if (!options?.requireDistributed) {
      logStructured("warn", "rate_limit.memory_fallback", {
        namespace,
        requestId: options?.requestId,
      });
      logSecurityEvent("rate_limit_fallback", { namespace, requestId: options?.requestId });
    } else if (!strict) {
      logStructured("warn", "rate_limit.distributed_memory_fallback", {
        namespace,
        requestId: options?.requestId,
      });
      logSecurityEvent("rate_limit_fallback", { namespace, requestId: options?.requestId });
    }
  } else if (options?.requireDistributed && !strict) {
    logStructured("warn", "rate_limit.distributed_memory_fallback", {
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
