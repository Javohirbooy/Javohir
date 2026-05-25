import { getUpstashRedis } from "@/lib/upstash-redis";
import { REDIS_KEYS } from "@/lib/cron/redis-keys";

const MAX_RETRY_ATTEMPTS = 5;

/** Exponential backoff: 30s, 60s, 120s, 240s, 480s (capped). */
export function nextRetryAtMs(attempt: number): number {
  const base = 30_000;
  const exp = Math.min(attempt, 4);
  return Date.now() + base * 2 ** exp;
}

export async function scheduleFinalizeRetry(sessionId: string, attempt: number): Promise<void> {
  if (attempt >= MAX_RETRY_ATTEMPTS) return;
  const redis = getUpstashRedis();
  if (!redis) return;
  const at = nextRetryAtMs(attempt);
  try {
    await redis.zadd(REDIS_KEYS.retryFinalize, { score: at, member: `${sessionId}:${attempt}` });
  } catch {
    /* best effort */
  }
}

export async function dueRetrySessionIds(limit: number): Promise<string[]> {
  const redis = getUpstashRedis();
  if (!redis) return [];
  const now = Date.now();
  try {
    const members = await redis.zrange(REDIS_KEYS.retryFinalize, 0, now, {
      byScore: true,
      offset: 0,
      count: limit,
    });
    if (!Array.isArray(members)) return [];
    const ids: string[] = [];
    for (const m of members) {
      const id = String(m).split(":")[0];
      if (id) ids.push(id);
      await redis.zrem(REDIS_KEYS.retryFinalize, m);
    }
    return ids;
  } catch {
    return [];
  }
}
