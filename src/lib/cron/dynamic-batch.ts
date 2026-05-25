import { getUpstashRedis } from "@/lib/upstash-redis";
import { REDIS_KEYS } from "@/lib/cron/redis-keys";
import type { CronJobName } from "@/lib/cron/cron-config";

export type CronMetricsSnapshot = {
  durationMs: number;
  errors: number;
  finalized?: number;
  at: string;
};

const MIN_BATCH = 10;
const MAX_BATCH = 200;

export function computeDynamicBatch(params: {
  baseBatch: number;
  maxRounds: number;
  budgetMs: number;
  metrics?: CronMetricsSnapshot | null;
}): { batchLimit: number; maxRounds: number; reason?: string } {
  let batch = Math.min(MAX_BATCH, Math.max(MIN_BATCH, params.baseBatch));
  let rounds = params.maxRounds;
  const reasons: string[] = [];

  const m = params.metrics;
  if (m) {
    if (m.errors >= 3) {
      batch = Math.max(MIN_BATCH, Math.floor(batch * 0.5));
      rounds = Math.max(5, Math.floor(rounds * 0.6));
      reasons.push("high_errors");
    }
    if (m.durationMs > params.budgetMs * 0.85) {
      batch = Math.max(MIN_BATCH, Math.floor(batch * 0.65));
      rounds = Math.max(5, Math.floor(rounds * 0.7));
      reasons.push("near_timeout");
    }
    if (m.durationMs < params.budgetMs * 0.35 && m.errors === 0) {
      batch = Math.min(MAX_BATCH, Math.floor(batch * 1.15));
      reasons.push("headroom");
    }
  }

  return {
    batchLimit: batch,
    maxRounds: Math.min(100, rounds),
    reason: reasons.length ? reasons.join(",") : undefined,
  };
}

export async function readCronMetrics(job: CronJobName): Promise<CronMetricsSnapshot | null> {
  const redis = getUpstashRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get<string>(REDIS_KEYS.metricsCron(job));
    if (typeof raw !== "string") return null;
    return JSON.parse(raw) as CronMetricsSnapshot;
  } catch {
    return null;
  }
}

export async function writeCronMetrics(job: CronJobName, snapshot: CronMetricsSnapshot): Promise<void> {
  const redis = getUpstashRedis();
  if (!redis) return;
  try {
    await redis.set(REDIS_KEYS.metricsCron(job), JSON.stringify(snapshot), { ex: 60 * 60 * 24 });
  } catch {
    /* best effort */
  }
}
