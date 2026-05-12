import { getUpstashRedis } from "@/lib/upstash-redis";
import { logStructured } from "@/lib/logger";

const KEY = "iq:worker:olympiad_finalize:lastOk";

export type OlympiadCronHeartbeatPayload = {
  at: string;
  ok: boolean;
  finalized?: number;
  repaired?: number;
  skipped?: number;
  errors?: number;
  durationMs?: number;
  runId?: string;
};

/** Tashqi cron / Vercel Cron muvaffaqiyatli ishlaganda Redis ga yoziladi (TTL 14 kun). */
export async function recordOlympiadFinalizeHeartbeat(payload: OlympiadCronHeartbeatPayload): Promise<void> {
  const redis = getUpstashRedis();
  if (!redis) return;
  try {
    await redis.set(KEY, JSON.stringify(payload), { ex: 60 * 60 * 24 * 14 });
  } catch (e) {
    logStructured("warn", "worker.olympiad_heartbeat_redis_failed", {
      message: e instanceof Error ? e.message : String(e),
    });
  }
}

export async function readOlympiadFinalizeHeartbeat(): Promise<OlympiadCronHeartbeatPayload | null> {
  const redis = getUpstashRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(KEY);
    if (typeof raw !== "string") return null;
    return JSON.parse(raw) as OlympiadCronHeartbeatPayload;
  } catch {
    return null;
  }
}
