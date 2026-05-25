import { getUpstashRedis } from "@/lib/upstash-redis";
import { logStructured } from "@/lib/logger";
import type { CronJobName } from "@/lib/cron/cron-config";
import type { CronLockBackend } from "@/lib/cron/distributed-lock";

const KEY = "iq:worker:cron:lastRun";

export type CronRunStatusPayload = {
  job: CronJobName;
  at: string;
  ok: boolean;
  durationMs?: number;
  skipped?: boolean;
  skipReason?: string;
  lockBackend?: CronLockBackend;
  runId?: string;
  finalized?: number;
  errors?: number;
};

/** Oxirgi cron chaqiruv — health va admin panel uchun (TTL 14 kun). */
export async function recordCronRunStatus(payload: CronRunStatusPayload): Promise<void> {
  const redis = getUpstashRedis();
  if (!redis) return;
  try {
    await redis.hset(KEY, { [payload.job]: JSON.stringify(payload) });
    await redis.expire(KEY, 60 * 60 * 24 * 14);
  } catch (e) {
    logStructured("warn", "worker.cron_run_status_failed", {
      job: payload.job,
      message: e instanceof Error ? e.message : String(e),
    });
  }
}

export async function readCronRunStatuses(): Promise<Partial<Record<CronJobName, CronRunStatusPayload>>> {
  const redis = getUpstashRedis();
  if (!redis) return {};
  try {
    const raw = await redis.hgetall<Record<string, string>>(KEY);
    if (!raw || typeof raw !== "object") return {};
    const out: Partial<Record<CronJobName, CronRunStatusPayload>> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v !== "string") continue;
      try {
        out[k as CronJobName] = JSON.parse(v) as CronRunStatusPayload;
      } catch {
        /* skip */
      }
    }
    return out;
  } catch {
    return {};
  }
}
