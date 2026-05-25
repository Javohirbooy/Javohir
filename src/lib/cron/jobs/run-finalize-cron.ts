import { CRON_FINALIZE_BUDGET_MS } from "@/lib/cron/cron-config";
import { computeDynamicBatch, readCronMetrics, writeCronMetrics } from "@/lib/cron/dynamic-batch";
import { evaluateLoadShed } from "@/lib/cron/load-shed";
import { runCronWatchdog } from "@/lib/cron/watchdog";
import { runOlympiadOverdueFinalization } from "@/lib/olympiad/finalize-overdue-worker";
import { recordOlympiadFinalizeHeartbeat } from "@/lib/worker/olympiad-cron-heartbeat";
import { dueRetrySessionIds } from "@/lib/queue/retry";
import { finalizeSessionWithDedicatedTransaction } from "@/lib/olympiad/finalize-overdue-worker";
import { OLYMPIAD_FINALIZATION_REASON } from "@/lib/olympiad/finalization-constants";
import { deadLetterDepth } from "@/lib/queue/dead-letter";
import { logStructured } from "@/lib/logger";

export type FinalizeCronMode = "tick" | "nightly";

export type FinalizeCronJobResult = {
  stats: Awaited<ReturnType<typeof runOlympiadOverdueFinalization>> | null;
  watchdog: Awaited<ReturnType<typeof runCronWatchdog>>;
  loadShed?: { allowFinalize: boolean; reason?: string };
  dynamicBatch?: { batchLimit: number; maxRounds: number; reason?: string };
  retryProcessed: number;
  dlqDepth: number;
};

async function processDueRetries(runId: string): Promise<number> {
  const ids = await dueRetrySessionIds(10);
  let n = 0;
  const at = new Date();
  for (const sessionId of ids) {
    try {
      await finalizeSessionWithDedicatedTransaction(sessionId, {
        at,
        runId,
        finalizationReason: OLYMPIAD_FINALIZATION_REASON.AUTO_TIMEOUT,
        allowActiveNotOverdue: false,
      });
      n += 1;
    } catch {
      /* DLQ on next watchdog */
    }
  }
  return n;
}

export async function runFinalizeCronJob(params: {
  mode: FinalizeCronMode;
  baseBatch: number;
  baseRounds: number;
  runWatchdog?: boolean;
}): Promise<FinalizeCronJobResult> {
  const budgetMs =
    params.mode === "nightly" ? CRON_FINALIZE_BUDGET_MS.nightly : CRON_FINALIZE_BUDGET_MS.tick;
  const jobName = params.mode === "nightly" ? "olympiad-finalize" : "tick";

  const watchdog = await runCronWatchdog();
  const loadShed = await evaluateLoadShed(jobName);
  const metrics = await readCronMetrics(jobName);
  const dynamic = computeDynamicBatch({
    baseBatch: params.baseBatch,
    maxRounds: params.baseRounds,
    budgetMs,
    metrics,
  });

  const retryProcessed = await processDueRetries(`retry_${Date.now().toString(36)}`);
  const dlqDepth = await deadLetterDepth();

  let stats: Awaited<ReturnType<typeof runOlympiadOverdueFinalization>> | null = null;

  if (loadShed.allowFinalize) {
    stats = await runOlympiadOverdueFinalization({
      batchLimit: dynamic.batchLimit,
      maxRounds: dynamic.maxRounds,
      deadlineMs: budgetMs,
    });

    const at = new Date().toISOString();
    await recordOlympiadFinalizeHeartbeat({
      at,
      ok: stats.errors === 0,
      finalized: stats.finalized,
      repaired: stats.repaired,
      skipped: stats.skipped,
      errors: stats.errors,
      durationMs: stats.durationMs,
      runId: stats.runId,
      staleSubmittingFinalized: stats.staleSubmittingFinalized,
      staleSubmittingRepaired: stats.staleSubmittingRepaired,
    });

    await writeCronMetrics(jobName, {
      at,
      durationMs: stats.durationMs,
      errors: stats.errors,
      finalized: stats.finalized,
    });
  } else {
    logStructured("warn", "cron.finalize.load_shed", {
      reason: loadShed.reason,
      mode: params.mode,
    });
  }

  return {
    stats,
    watchdog,
    loadShed,
    dynamicBatch: dynamic,
    retryProcessed,
    dlqDepth,
  };
}
