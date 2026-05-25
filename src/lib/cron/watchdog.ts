import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { getUpstashRedis } from "@/lib/upstash-redis";
import { logStructured } from "@/lib/logger";
import { CRON_LOCK, CRON_LOCK_TTL_SEC } from "@/lib/cron/cron-config";
import { REDIS_KEYS } from "@/lib/cron/redis-keys";
import { OLYMPIAD_FINALIZE_LEASE_MS } from "@/lib/olympiad/finalization-constants";
import { readOlympiadFinalizeHeartbeat } from "@/lib/worker/olympiad-cron-heartbeat";
import { readUptimeHeartbeat } from "@/lib/worker/uptime-heartbeat";
import { popDeadLetterFinalize, pushDeadLetterFinalize } from "@/lib/queue/dead-letter";
import { finalizeSessionWithDedicatedTransaction } from "@/lib/olympiad/finalize-overdue-worker";
import { OLYMPIAD_FINALIZATION_REASON } from "@/lib/olympiad/finalization-constants";

export type WatchdogReport = {
  staleSessionLocksCleared: number;
  redisLocksForceCleared: number;
  dlqReplayed: number;
  dlqReplayErrors: number;
  finalizeHeartbeatStale: boolean;
  uptimeHeartbeatStale: boolean;
};

const HEARTBEAT_STALE_MS = 25 * 60 * 1000;
const DLQ_REPLAY_LIMIT = 15;

/** Redis lock TTL tugagan bo‘lsa avtomatik yo‘q; bu faqat “orphan” holat uchun. */
async function forceClearRedisLockIfTtlMissing(lockKey: string): Promise<number> {
  const redis = getUpstashRedis();
  if (!redis) return 0;
  try {
    const ttl = await redis.ttl(lockKey);
    if (ttl === -1) {
      await redis.del(lockKey);
      logStructured("warn", "cron.watchdog.redis_lock_no_ttl_cleared", { lockKey });
      return 1;
    }
  } catch {
    /* ignore */
  }
  return 0;
}

/**
 * DB `processingLock` qolgan sessiyalar — serverless crash dan keyin self-healing.
 * WHY: Duplicate finalize oldini session-level lease + idempotent result bilan saqlanadi.
 */
export async function clearStaleSessionProcessingLocks(): Promise<number> {
  if (!isDatabaseConfigured()) return 0;
  const cutoff = new Date(Date.now() - OLYMPIAD_FINALIZE_LEASE_MS);
  const res = await prisma.olympiadSession.updateMany({
    where: {
      processingLock: { not: null },
      processingStartedAt: { lt: cutoff },
      status: { in: ["ACTIVE", "SUBMITTING"] },
    },
    data: { processingLock: null, processingStartedAt: null },
  });
  if (res.count > 0) {
    logStructured("warn", "cron.watchdog.stale_session_locks_cleared", { count: res.count });
  }
  return res.count;
}

async function replayDeadLetterBatch(runId: string): Promise<{ replayed: number; errors: number }> {
  let replayed = 0;
  let errors = 0;
  const at = new Date();

  for (let i = 0; i < DLQ_REPLAY_LIMIT; i++) {
    const item = await popDeadLetterFinalize();
    if (!item) break;
    try {
      const out = await finalizeSessionWithDedicatedTransaction(item.sessionId, {
        at,
        runId,
        finalizationReason: OLYMPIAD_FINALIZATION_REASON.AUTO_TIMEOUT,
        allowActiveNotOverdue: item.allowActiveNotOverdue ?? false,
      });
      if (out === "skipped" && (item.attempts ?? 0) < 5) {
        await pushDeadLetterFinalize({
          sessionId: item.sessionId,
          reason: "replay_skipped",
          runId,
          attempts: (item.attempts ?? 0) + 1,
        });
      } else if (out !== "skipped") {
        replayed += 1;
      }
    } catch (e) {
      errors += 1;
      await pushDeadLetterFinalize({
        sessionId: item.sessionId,
        reason: e instanceof Error ? e.message : "replay_error",
        runId,
        attempts: (item.attempts ?? 0) + 1,
      });
    }
  }

  return { replayed, errors };
}

function isHeartbeatStale(atIso: string | undefined, staleMs: number): boolean {
  if (!atIso) return true;
  const t = Date.parse(atIso);
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > staleMs;
}

export async function runCronWatchdog(): Promise<WatchdogReport> {
  const runId = `wd_${Date.now().toString(36)}`;
  const staleSessionLocksCleared = await clearStaleSessionProcessingLocks();

  let redisLocksForceCleared = 0;
  redisLocksForceCleared += await forceClearRedisLockIfTtlMissing(CRON_LOCK.olympiadFinalize);
  redisLocksForceCleared += await forceClearRedisLockIfTtlMissing(CRON_LOCK.uptimePing);

  const dlq = await replayDeadLetterBatch(runId);

  const finHb = await readOlympiadFinalizeHeartbeat();
  const upHb = await readUptimeHeartbeat();

  const report: WatchdogReport = {
    staleSessionLocksCleared,
    redisLocksForceCleared,
    dlqReplayed: dlq.replayed,
    dlqReplayErrors: dlq.errors,
    finalizeHeartbeatStale: isHeartbeatStale(finHb?.at, HEARTBEAT_STALE_MS),
    uptimeHeartbeatStale: isHeartbeatStale(upHb?.at, HEARTBEAT_STALE_MS),
  };

  logStructured("info", "cron.watchdog.complete", {
    runId,
    ...report,
    lockTtlFinalizeSec: CRON_LOCK_TTL_SEC.olympiadFinalize,
  });

  return report;
}
