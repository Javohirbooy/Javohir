import { getUpstashRedis } from "@/lib/upstash-redis";
import { logStructured } from "@/lib/logger";

const KEY = "iq:worker:uptime_keepalive:lastOk";

export type UptimeHeartbeatPayload = {
  at: string;
  ok: boolean;
  database?: boolean;
  redis?: boolean;
  durationMs?: number;
};

export async function recordUptimeHeartbeat(payload: UptimeHeartbeatPayload): Promise<void> {
  const redis = getUpstashRedis();
  if (!redis) return;
  try {
    await redis.set(KEY, JSON.stringify(payload), { ex: 60 * 60 * 24 * 14 });
  } catch (e) {
    logStructured("warn", "worker.uptime_heartbeat_redis_failed", {
      message: e instanceof Error ? e.message : String(e),
    });
  }
}

export async function readUptimeHeartbeat(): Promise<UptimeHeartbeatPayload | null> {
  const redis = getUpstashRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(KEY);
    if (typeof raw !== "string") return null;
    return JSON.parse(raw) as UptimeHeartbeatPayload;
  } catch {
    return null;
  }
}
