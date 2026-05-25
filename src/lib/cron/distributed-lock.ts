import { randomBytes } from "crypto";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { getUpstashRedis } from "@/lib/upstash-redis";
import { logStructured } from "@/lib/logger";

export type CronLockBackend = "redis" | "postgres" | "none";

export type AcquireCronLockResult =
  | { acquired: true; token: string; backend: CronLockBackend }
  | { acquired: false; backend: CronLockBackend; holder?: string };

/** Advisory lock ikkinchi int — job nomidan deterministik. */
export function advisoryLockPair(lockKey: string): [number, number] {
  let h1 = 0x1a2b3c4d;
  let h2 = 0x5e6f7081;
  for (let i = 0; i < lockKey.length; i++) {
    const c = lockKey.charCodeAt(i);
    h1 = Math.imul(31, h1) + c;
    h2 = Math.imul(37, h2) + c;
  }
  return [h1 >>> 0, h2 >>> 0];
}

function newLockToken(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Redis SET NX — tez, serverless uchun mos.
 * WHY: Ikki Vercel Cron + GitHub Actions bir vaqtda finalize ishga tushmasin.
 */
async function tryAcquireRedisLock(lockKey: string, token: string, ttlSec: number): Promise<boolean> {
  const redis = getUpstashRedis();
  if (!redis) return false;
  try {
    const res = await redis.set(lockKey, token, { nx: true, ex: ttlSec });
    return res === "OK";
  } catch (e) {
    logStructured("warn", "cron.lock.redis_acquire_failed", {
      lockKey,
      message: e instanceof Error ? e.message : String(e),
    });
    return false;
  }
}

async function releaseRedisLock(lockKey: string, token: string): Promise<void> {
  const redis = getUpstashRedis();
  if (!redis) return;
  try {
    await redis.eval(
      `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`,
      [lockKey],
      [token],
    );
  } catch (e) {
    logStructured("warn", "cron.lock.redis_release_failed", {
      lockKey,
      message: e instanceof Error ? e.message : String(e),
    });
  }
}

/**
 * PostgreSQL advisory lock — Redis yo‘q bo‘lsa ham overlap kamayadi.
 * WHY: Hobby / devda Upstash bo‘lmasa ham ikki parallel finalize xavfi past.
 */
async function tryAcquirePostgresLock(lockKey: string): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  const [k1, k2] = advisoryLockPair(lockKey);
  try {
    const rows = await prisma.$queryRaw<Array<{ acquired: boolean }>>`
      SELECT pg_try_advisory_lock(${k1}::int, ${k2}::int) AS acquired
    `;
    return rows[0]?.acquired === true;
  } catch (e) {
    logStructured("warn", "cron.lock.postgres_acquire_failed", {
      lockKey,
      message: e instanceof Error ? e.message : String(e),
    });
    return false;
  }
}

async function releasePostgresLock(lockKey: string): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const [k1, k2] = advisoryLockPair(lockKey);
  try {
    await prisma.$queryRaw`SELECT pg_advisory_unlock(${k1}::int, ${k2}::int)`;
  } catch (e) {
    logStructured("warn", "cron.lock.postgres_release_failed", {
      lockKey,
      message: e instanceof Error ? e.message : String(e),
    });
  }
}

export async function acquireCronLock(lockKey: string, ttlSec: number): Promise<AcquireCronLockResult> {
  const token = newLockToken();

  if (await tryAcquireRedisLock(lockKey, token, ttlSec)) {
    return { acquired: true, token, backend: "redis" };
  }

  const redis = getUpstashRedis();
  if (redis) {
    try {
      const holder = await redis.get<string>(lockKey);
      if (holder) {
        return { acquired: false, backend: "redis", holder: typeof holder === "string" ? holder.slice(0, 12) : undefined };
      }
    } catch {
      /* fallback postgres */
    }
  }

  if (await tryAcquirePostgresLock(lockKey)) {
    return { acquired: true, token: `pg:${token}`, backend: "postgres" };
  }

  return { acquired: false, backend: redis ? "redis" : isDatabaseConfigured() ? "postgres" : "none" };
}

export async function releaseCronLock(lockKey: string, acquired: AcquireCronLockResult): Promise<void> {
  if (!acquired.acquired) return;
  if (acquired.backend === "redis") {
    await releaseRedisLock(lockKey, acquired.token);
    return;
  }
  if (acquired.backend === "postgres") {
    await releasePostgresLock(lockKey);
  }
}

export type WithCronLockResult<T> =
  | { ran: true; backend: CronLockBackend; result: T }
  | { ran: false; backend: CronLockBackend; reason: "lock_held" };

/**
 * Lock olish → ish → qo‘yib yuborish. Xato bo‘lsa ham release (finally).
 */
export async function withCronDistributedLock<T>(params: {
  lockKey: string;
  ttlSec: number;
  job: string;
  fn: () => Promise<T>;
}): Promise<WithCronLockResult<T>> {
  const acquired = await acquireCronLock(params.lockKey, params.ttlSec);
  if (!acquired.acquired) {
    logStructured("info", "cron.lock.skipped", {
      job: params.job,
      lockKey: params.lockKey,
      backend: acquired.backend,
      holder: acquired.holder,
    });
    return { ran: false, backend: acquired.backend, reason: "lock_held" };
  }

  logStructured("info", "cron.lock.acquired", {
    job: params.job,
    lockKey: params.lockKey,
    backend: acquired.backend,
  });

  try {
    const result = await params.fn();
    return { ran: true, backend: acquired.backend, result };
  } finally {
    await releaseCronLock(params.lockKey, acquired);
    logStructured("info", "cron.lock.released", { job: params.job, lockKey: params.lockKey });
  }
}
