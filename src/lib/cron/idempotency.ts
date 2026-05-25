import { getUpstashRedis } from "@/lib/upstash-redis";
import { logStructured } from "@/lib/logger";
import { REDIS_KEYS } from "@/lib/cron/redis-keys";
import type { CronJobName } from "@/lib/cron/cron-config";

const IDEM_TTL_SEC = 60 * 60;

export function resolveCronIdempotencyKey(req: Request, job: CronJobName): string {
  const explicit = req.headers.get("x-cron-idempotency-key")?.trim();
  if (explicit && explicit.length <= 128) return explicit;

  const schedule = req.headers.get("x-vercel-cron-schedule-time")?.trim();
  if (schedule) return `${job}:vercel:${schedule}`;

  if (req.headers.get("x-vercel-cron")) {
    const bucketMin = 10;
    const bucket = Math.floor(Date.now() / (bucketMin * 60 * 1000));
    return `${job}:vercel:${bucket}`;
  }

  return `${job}:ext:${Date.now()}`;
}

export type CronIdempotencyResult =
  | { proceed: true; key: string }
  | { proceed: false; key: string; reason: "duplicate_invocation" };

/**
 * WHY: Vercel retry / parallel GH + Vercel bir xil oynada ikki marta ishlamasin.
 * Duplicate → HTTP 200 + skipped (scheduler retry storm emas).
 */
export async function claimCronIdempotency(job: CronJobName, key: string): Promise<CronIdempotencyResult> {
  const redis = getUpstashRedis();
  if (!redis) return { proceed: true, key };

  const redisKey = REDIS_KEYS.cronIdempotency(job, key);
  try {
    const ok = await redis.set(redisKey, "1", { nx: true, ex: IDEM_TTL_SEC });
    if (ok === "OK") return { proceed: true, key };
    logStructured("info", "cron.idempotency.duplicate", { job, idempotencyKey: key });
    return { proceed: false, key, reason: "duplicate_invocation" };
  } catch (e) {
    logStructured("warn", "cron.idempotency.redis_failed", {
      job,
      message: e instanceof Error ? e.message : String(e),
    });
    return { proceed: true, key };
  }
}
