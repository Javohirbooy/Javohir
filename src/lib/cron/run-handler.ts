import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { logStructured } from "@/lib/logger";
import { withCronDistributedLock, type CronLockBackend, type WithCronLockResult } from "@/lib/cron/distributed-lock";
import { recordCronRunStatus } from "@/lib/worker/cron-run-status";
import type { CronJobName } from "@/lib/cron/cron-config";
import { cronInvokerHint } from "@/lib/cron/authorize";
import { claimCronIdempotency, resolveCronIdempotencyKey } from "@/lib/cron/idempotency";
import { traceCronSpan } from "@/lib/observability/cron-metrics";

export type CronHandlerBody<T> = {
  ok: boolean;
  job: CronJobName;
  at: string;
  durationMs: number;
  invoker: string;
  skipped?: boolean;
  skipReason?: string;
  idempotencyKey?: string;
  lockBackend?: CronLockBackend;
  data?: T;
  error?: string;
};

type RunCronOptions<T> = {
  req: Request;
  job: CronJobName;
  lockKey: string;
  lockTtlSec: number;
  handler: () => Promise<T>;
  onSuccess?: (result: T) => Promise<Partial<import("@/lib/worker/cron-run-status").CronRunStatusPayload> | void>;
  onSkipped?: () => Promise<void>;
  onFailure?: () => Promise<void>;
};

function cronRunId(job: CronJobName): string {
  return `cron_${job}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Barcha cron route lar uchun yagona oqim: log → lock → ish → heartbeat → JSON.
 * WHY: 409 emas 200 + skipped — Vercel cron qayta-qayta retry qilmasin.
 */
export async function executeCronJob<T>(opts: RunCronOptions<T>): Promise<NextResponse> {
  const at = new Date().toISOString();
  const started = Date.now();
  const invoker = cronInvokerHint(opts.req);
  const runId = cronRunId(opts.job);

  const finish = async (body: CronHandlerBody<T>, status: number) => {
    logStructured(status >= 500 ? "error" : "info", "cron.job.finish", {
      job: opts.job,
      invoker,
      runId,
      ok: body.ok,
      skipped: body.skipped,
      durationMs: body.durationMs,
      status,
    });
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  };

  const idempotencyKey = resolveCronIdempotencyKey(opts.req, opts.job);
  logStructured("info", "cron.job.start", { job: opts.job, invoker, runId, idempotencyKey });

  const idem = await claimCronIdempotency(opts.job, idempotencyKey);
  if (!idem.proceed) {
    const durationMs = Date.now() - started;
    await recordCronRunStatus({
      job: opts.job,
      at,
      ok: true,
      durationMs,
      skipped: true,
      skipReason: idem.reason,
      runId,
    });
    return finish(
      {
        ok: true,
        job: opts.job,
        at,
        durationMs,
        invoker,
        skipped: true,
        skipReason: idem.reason,
        idempotencyKey,
      },
      200,
    );
  }

  try {
    const locked = await withCronDistributedLock({
      lockKey: opts.lockKey,
      ttlSec: opts.lockTtlSec,
      job: opts.job,
      fn: opts.handler,
    });
    const durationMs = Date.now() - started;

    if (!locked.ran) {
      await opts.onSkipped?.();
      await recordCronRunStatus({
        job: opts.job,
        at,
        ok: true,
        durationMs,
        skipped: true,
        skipReason: "lock_held",
        lockBackend: locked.backend,
        runId,
      });
      return finish(
        {
          ok: true,
          job: opts.job,
          at,
          durationMs,
          invoker,
          skipped: true,
          skipReason: "lock_held",
          lockBackend: locked.backend,
          idempotencyKey,
        },
        200,
      );
    }

    traceCronSpan(opts.job, { runId, invoker, lockBackend: locked.backend });

    const extra = (await opts.onSuccess?.(locked.result)) ?? {};
    await recordCronRunStatus({
      job: opts.job,
      at,
      ok: true,
      durationMs,
      lockBackend: locked.backend,
      runId,
      ...extra,
    });

    return finish(
      {
        ok: true,
        job: opts.job,
        at,
        durationMs,
        invoker,
        lockBackend: locked.backend,
        data: locked.result,
        idempotencyKey,
      },
      200,
    );
  } catch (e) {
    Sentry.captureException(e, { tags: { component: "cron", job: opts.job, invoker } });
    await opts.onFailure?.();
    const durationMs = Date.now() - started;
    await recordCronRunStatus({
      job: opts.job,
      at,
      ok: false,
      durationMs,
      runId,
      errors: 1,
    });
    return finish(
      {
        ok: false,
        job: opts.job,
        at,
        durationMs,
        invoker,
        error: "internal_error",
      },
      500,
    );
  }
}
