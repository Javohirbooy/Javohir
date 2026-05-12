import { createHash } from "crypto";
import * as Sentry from "@sentry/nextjs";
import { logStructured } from "@/lib/logger";
import { logSecurityEvent } from "@/lib/security-events";
import { getUpstashRedis } from "@/lib/upstash-redis";
import { isStrictDistributedRateLimitPolicy } from "@/lib/redis-strict-policy";

const FAIL_KEY_TTL_SEC = 900;
const LOCKOUT_TTL_SEC = 900;
const FAIL_THRESHOLD = 12;

type MemEntry = { fails: number; resetAt: number; lockedUntil: number };
const memoryStore = new Map<string, MemEntry>();

export function loginFingerprint(ip: string, normalizedIdentifier: string): string {
  return createHash("sha256")
    .update(`${ip}|${normalizedIdentifier}`, "utf8")
    .digest("hex")
    .slice(0, 32);
}

export async function isLoginBlocked(fingerprint: string): Promise<boolean> {
  const strict = isStrictDistributedRateLimitPolicy();
  const redis = getUpstashRedis();
  if (redis) {
    try {
      const v = await redis.get(`iq:lock:login:${fingerprint}`);
      if (v !== null && v !== undefined) {
        logSecurityEvent("auth.blocked", { fpPrefix: fingerprint.slice(0, 8) });
      }
      return v !== null && v !== undefined;
    } catch (e) {
      console.error("[auth-lockout] redis get", e);
      if (strict) {
        logStructured("error", "auth.lockout.redis_read_failed_strict", { fpPrefix: fingerprint.slice(0, 8) });
        Sentry.captureException(e, { tags: { component: "auth_lockout", op: "get" } });
        /** Fail closed: Redis holatini tekshira olmasak — kirishni rad etamiz. */
        return true;
      }
    }
  } else if (strict) {
    logStructured("error", "auth.lockout.no_redis_strict", { fpPrefix: fingerprint.slice(0, 8) });
    /** Rate limit allaqachon fail-closed; bu yerda “hammani bloklash” qilmaymiz. */
    return false;
  }
  const m = memoryStore.get(fingerprint);
  if (!m) return false;
  const now = Date.now();
  if (m.lockedUntil > now) return true;
  if (m.resetAt <= now) memoryStore.delete(fingerprint);
  return false;
}

export async function registerFailedAttempt(fingerprint: string): Promise<void> {
  const strict = isStrictDistributedRateLimitPolicy();
  const redis = getUpstashRedis();
  if (redis) {
    try {
      const n = await redis.incr(`iq:fail:login:${fingerprint}`);
      await redis.expire(`iq:fail:login:${fingerprint}`, FAIL_KEY_TTL_SEC);
      const count = typeof n === "number" ? n : Number(n);
      if (Number.isFinite(count) && count >= FAIL_THRESHOLD) {
        await redis.set(`iq:lock:login:${fingerprint}`, "1", { ex: LOCKOUT_TTL_SEC });
        logStructured("warn", "auth.lockout_activated", {
          threshold: FAIL_THRESHOLD,
          fpPrefix: fingerprint.slice(0, 8),
        });
        logSecurityEvent("auth_lockout_triggered", {
          threshold: FAIL_THRESHOLD,
          fpPrefix: fingerprint.slice(0, 8),
        });
      } else if (Number.isFinite(count) && count >= Math.floor(FAIL_THRESHOLD * 0.75)) {
        logStructured("warn", "auth.suspicious_login_pattern", {
          fails: count,
          fpPrefix: fingerprint.slice(0, 8),
        });
        logSecurityEvent("auth.suspicious", { fails: count, fpPrefix: fingerprint.slice(0, 8) });
      }
      return;
    } catch (e) {
      console.error("[auth-lockout] redis incr", e);
      if (strict) {
        Sentry.captureException(e, { tags: { component: "auth_lockout", op: "incr" } });
        logStructured("error", "auth.lockout.redis_write_failed_strict", { fpPrefix: fingerprint.slice(0, 8) });
        return;
      }
    }
  } else if (strict) {
    logStructured("error", "auth.lockout.no_redis_strict_incr", { fpPrefix: fingerprint.slice(0, 8) });
    return;
  }

  const now = Date.now();
  let row = memoryStore.get(fingerprint);
  if (!row || row.resetAt <= now) {
    row = { fails: 0, resetAt: now + FAIL_KEY_TTL_SEC * 1000, lockedUntil: 0 };
  }
  row.fails += 1;
  if (row.fails >= FAIL_THRESHOLD) {
    row.lockedUntil = now + LOCKOUT_TTL_SEC * 1000;
    logStructured("warn", "auth.lockout_activated", {
      threshold: FAIL_THRESHOLD,
      fpPrefix: fingerprint.slice(0, 8),
      backend: "memory",
    });
    logSecurityEvent("auth.locked", {
      threshold: FAIL_THRESHOLD,
      fpPrefix: fingerprint.slice(0, 8),
      backend: "memory",
    });
  } else if (row.fails >= Math.floor(FAIL_THRESHOLD * 0.75)) {
    logStructured("warn", "auth.suspicious_login_pattern", {
      fails: row.fails,
      fpPrefix: fingerprint.slice(0, 8),
      backend: "memory",
    });
    logSecurityEvent("auth.suspicious", {
      fails: row.fails,
      fpPrefix: fingerprint.slice(0, 8),
      backend: "memory",
    });
  }
  memoryStore.set(fingerprint, row);
}

export async function clearLoginAttempts(fingerprint: string): Promise<void> {
  const strict = isStrictDistributedRateLimitPolicy();
  const redis = getUpstashRedis();
  if (redis) {
    try {
      await redis.del(`iq:fail:login:${fingerprint}`);
      await redis.del(`iq:lock:login:${fingerprint}`);
      return;
    } catch (e) {
      console.error("[auth-lockout] redis del", e);
      if (strict) {
        Sentry.captureException(e, { tags: { component: "auth_lockout", op: "del" } });
        return;
      }
    }
  } else if (strict) {
    return;
  }
  memoryStore.delete(fingerprint);
}
