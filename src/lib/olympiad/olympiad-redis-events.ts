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

export async function readRecentOlympiadMonitorEvents(olympiadId: string, take: number): Promise<OlympiadMonitorEventPayload[]> {
  const redis = getUpstashRedis();
  if (!redis) return [];
  const key = `${LIST_PREFIX}${olympiadId}`;
  try {
    const n = Math.min(200, Math.max(1, take));
    const raw = await redis.lrange<string>(key, 0, n - 1);
    const out: OlympiadMonitorEventPayload[] = [];
    for (const r of raw) {
      try {
        out.push(JSON.parse(r) as OlympiadMonitorEventPayload);
      } catch {
        /* skip */
      }
    }
    return out;
  } catch {
    return [];
  }
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
