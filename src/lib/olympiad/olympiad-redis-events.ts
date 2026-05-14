import { getUpstashRedis } from "@/lib/upstash-redis";
import { logStructured } from "@/lib/logger";

const LIST_PREFIX = "iq:olymp:ev:";
const STAT_PREFIX = "iq:olymp:rm:";

export type OlympiadMonitorEventType = "exam_state_changed" | "violation_logged" | "autosave_received";

export type OlympiadMonitorEventPayload = {
  type: OlympiadMonitorEventType;
  olympiadId: string;
  sessionId?: string;
  meta?: Record<string, unknown>;
  ts: number;
};

/**
 * Redis event bus (LPUSH + LTRIM). Serverless uchun Pub/Sub o‘rniga.
 * Redis yo‘q bo‘lsa — no-op (monitor DB fallback).
 */
export async function emitOlympiadMonitorEvent(
  payload: Omit<OlympiadMonitorEventPayload, "ts"> & { ts?: number },
): Promise<void> {
  const redis = getUpstashRedis();
  if (!redis) return;
  const full: OlympiadMonitorEventPayload = { ...payload, ts: payload.ts ?? Date.now() };
  const key = `${LIST_PREFIX}${payload.olympiadId}`;
  try {
    await redis.lpush(key, JSON.stringify(full));
    await redis.ltrim(key, 0, 499);
    if (payload.type === "violation_logged") {
      await redis.hincrby(`${STAT_PREFIX}${payload.olympiadId}`, "violations", 1);
    }
    if (payload.type === "autosave_received") {
      await redis.hincrby(`${STAT_PREFIX}${payload.olympiadId}`, "autosaves", 1);
    }
    if (payload.type === "exam_state_changed") {
      await redis.hincrby(`${STAT_PREFIX}${payload.olympiadId}`, "state_changes", 1);
    }
    await redis.expire(`${STAT_PREFIX}${payload.olympiadId}`, 86_400);
  } catch (e) {
    void logStructured("warn", "olympiad.monitor_emit_failed", {
      olympiadId: payload.olympiadId.slice(0, 8),
      message: e instanceof Error ? e.message : String(e),
    });
  }
}

export type OlympiadMonitorRedisBundle = {
  events: OlympiadMonitorEventPayload[];
  readModel: Record<string, string> | null;
  /** True when Redis client is missing or reads fail — UI can fall back to DB-only snapshots. */
  redisUnavailable: boolean;
};

/**
 * Single round-trip Redis bundle for the monitor SSE tick.
 *
 * WHY: Separating "empty events because none happened" from "Redis is down"
 * lets the stream emit a stable degraded signal without hammering retries.
 */
export async function readOlympiadMonitorRedisBundle(
  olympiadId: string,
  takeEvents: number,
): Promise<OlympiadMonitorRedisBundle> {
  const redis = getUpstashRedis();
  if (!redis) {
    return { events: [], readModel: null, redisUnavailable: true };
  }
  const key = `${LIST_PREFIX}${olympiadId}`;
  const statKey = `${STAT_PREFIX}${olympiadId}`;
  try {
    const n = Math.min(200, Math.max(1, takeEvents));
    const [raw, h] = await Promise.all([
      redis.lrange<string>(key, 0, n - 1),
      redis.hgetall<Record<string, string>>(statKey),
    ]);
    const events: OlympiadMonitorEventPayload[] = [];
    for (const r of raw) {
      try {
        events.push(JSON.parse(r) as OlympiadMonitorEventPayload);
      } catch {
        /* skip */
      }
    }
    const readModel = h && Object.keys(h).length ? h : null;
    return { events, readModel, redisUnavailable: false };
  } catch (e) {
    void logStructured("warn", "olympiad.monitor_redis_bundle_failed", {
      olympiadId: olympiadId.slice(0, 8),
      message: e instanceof Error ? e.message : String(e),
    });
    return { events: [], readModel: null, redisUnavailable: true };
  }
}

export async function readRecentOlympiadMonitorEvents(olympiadId: string, take: number): Promise<OlympiadMonitorEventPayload[]> {
  const b = await readOlympiadMonitorRedisBundle(olympiadId, take);
  return b.events;
}

export async function readOlympiadReadModelCounters(olympiadId: string): Promise<Record<string, string> | null> {
  const redis = getUpstashRedis();
  if (!redis) return null;
  try {
    const h = await redis.hgetall<Record<string, string>>(`${STAT_PREFIX}${olympiadId}`);
    return h && Object.keys(h).length ? h : null;
  } catch {
    return null;
  }
}
