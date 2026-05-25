import { getUpstashRedis } from "@/lib/upstash-redis";
import { logStructured } from "@/lib/logger";
import { REDIS_KEYS } from "@/lib/cron/redis-keys";

const MAX_DLQ_LEN = 500;

export type FinalizeDeadLetterEntry = {
  sessionId: string;
  reason: string;
  runId?: string;
  at?: string;
  attempts?: number;
  allowActiveNotOverdue?: boolean;
};

export async function pushDeadLetterFinalize(entry: FinalizeDeadLetterEntry): Promise<void> {
  const redis = getUpstashRedis();
  if (!redis) return;
  const payload: FinalizeDeadLetterEntry = {
    ...entry,
    at: entry.at ?? new Date().toISOString(),
    attempts: entry.attempts ?? 1,
  };
  try {
    await redis.lpush(REDIS_KEYS.dlqFinalize, JSON.stringify(payload));
    await redis.ltrim(REDIS_KEYS.dlqFinalize, 0, MAX_DLQ_LEN - 1);
    logStructured("warn", "queue.dlq.push", {
      sessionId: entry.sessionId,
      reason: entry.reason,
      attempts: payload.attempts,
    });
  } catch (e) {
    logStructured("error", "queue.dlq.push_failed", {
      sessionId: entry.sessionId,
      message: e instanceof Error ? e.message : String(e),
    });
  }
}

export async function popDeadLetterFinalize(): Promise<FinalizeDeadLetterEntry | null> {
  const redis = getUpstashRedis();
  if (!redis) return null;
  try {
    const raw = await redis.rpop<string>(REDIS_KEYS.dlqFinalize);
    if (!raw || typeof raw !== "string") return null;
    return JSON.parse(raw) as FinalizeDeadLetterEntry;
  } catch {
    return null;
  }
}

export async function deadLetterDepth(): Promise<number> {
  const redis = getUpstashRedis();
  if (!redis) return 0;
  try {
    return (await redis.llen(REDIS_KEYS.dlqFinalize)) ?? 0;
  } catch {
    return 0;
  }
}
