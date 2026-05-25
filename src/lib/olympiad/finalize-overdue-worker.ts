import { Prisma } from "@prisma/client";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { pushDeadLetterFinalize } from "@/lib/queue/dead-letter";
import { scheduleFinalizeRetry } from "@/lib/queue/retry";
import { logStructured } from "@/lib/logger";
import { isOlympiadMonitorRedisEventsEnabled } from "@/lib/olympiad/feature-flags";
import { emitOlympiadMonitorEvent } from "@/lib/olympiad/olympiad-redis-events";
import { scoreOlympiadAttempt } from "@/lib/olympiad/scoring";
import { sha256HexUtf8, signSubmissionIntegrityV1 } from "@/lib/olympiad/submission-integrity";
import {
  OLYMPIAD_DISCONNECT_MS_BEFORE_DEADLINE,
  OLYMPIAD_FINALIZATION_REASON,
  OLYMPIAD_FINALIZE_LEASE_MS,
  OLYMPIAD_FINALIZE_VIOLATION,
  OLYMPIAD_STALE_SUBMITTING_LAST_SEEN_MS,
  type OlympiadFinalizationReason,
} from "@/lib/olympiad/finalization-constants";
import { isLeaseHeldByOtherWorker, parseOlympiadDisplayAnswers } from "@/lib/olympiad/finalize-logic";

const DEFAULT_BATCH = 50;
const MAX_ROUNDS_PER_INVOCATION = 25;

export type OlympiadFinalizeWorkerStats = {
  runId: string;
  rounds: number;
  staleSubmittingRounds: number;
  candidatesSeen: number;
  finalized: number;
  skipped: number;
  repaired: number;
  staleSubmittingFinalized: number;
  staleSubmittingRepaired: number;
  errors: number;
  durationMs: number;
};

export type FinalizeOlympiadSessionTxContext = {
  at: Date;
  runId: string;
  /** Worker: AUTO_*; admin: MANUAL_ADMIN_FINALIZE */
  finalizationReason: OlympiadFinalizationReason;
  /** Admin majburiy yopish: serverEndsAt hali kelmaganda ham ACTIVE yopiladi */
  allowActiveNotOverdue: boolean;
};

function randomRunId() {
  return `olf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function withSubmissionIntegrityFields<T extends { sessionId: string; participantId: string; olympiadId: string; score: number; maxScore: number; answersJson: string; finalizedAt: Date }>(
  row: T,
): T & { submissionIntegritySig: string | null; submissionCanonicalSha256: string | null } {
  const finalizedAtIso = row.finalizedAt.toISOString();
  const integrity = signSubmissionIntegrityV1({
    v: 1,
    sessionId: row.sessionId,
    olympiadId: row.olympiadId,
    participantId: row.participantId,
    score: row.score,
    maxScore: row.maxScore,
    answersSha256: sha256HexUtf8(row.answersJson),
    finalizedAtIso,
  });
  return {
    ...row,
    submissionIntegritySig: integrity?.sigHex ?? null,
    submissionCanonicalSha256: integrity?.canonicalSha256 ?? null,
  };
}

function violationTypeForReason(reason: OlympiadFinalizationReason): string {
  switch (reason) {
    case OLYMPIAD_FINALIZATION_REASON.DISCONNECTED_TIMEOUT:
      return OLYMPIAD_FINALIZE_VIOLATION.DISCONNECTED_TIMEOUT;
    case OLYMPIAD_FINALIZATION_REASON.MANUAL_ADMIN_FINALIZE:
      return OLYMPIAD_FINALIZE_VIOLATION.MANUAL_ADMIN;
    case OLYMPIAD_FINALIZATION_REASON.STALE_SUBMITTING_RECOVERY:
      return OLYMPIAD_FINALIZE_VIOLATION.STALE_SUBMITTING;
    default:
      return OLYMPIAD_FINALIZE_VIOLATION.AUTO_TIMEOUT;
  }
}

/**
 * Bitta ACTIVE sessiyani yakunlaydi (worker yoki admin). Idempotent: `OlympiadResult` bo‘lsa — sessiyani tuzatadi.
 * Tranzaksiya ichida chaqiriladi.
 */
export async function finalizeOlympiadSessionInTx(
  tx: Prisma.TransactionClient,
  sessionId: string,
  ctx: FinalizeOlympiadSessionTxContext,
): Promise<"finalized" | "skipped" | "repaired"> {
  const { at, runId, finalizationReason, allowActiveNotOverdue } = ctx;

  const overdueClause = allowActiveNotOverdue
    ? Prisma.raw("TRUE")
    : Prisma.sql`"serverEndsAt" IS NOT NULL AND "serverEndsAt" < ${at}`;

  const locked = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "OlympiadSession"
    WHERE id = ${sessionId}
      AND status IN ('ACTIVE', 'SUBMITTING')
      AND (${overdueClause})
    FOR UPDATE
  `;
  if (!locked.length) return "skipped";

  const session = await tx.olympiadSession.findFirst({
    where: { id: sessionId },
    include: { olympiad: true, attempt: true },
  });
  if (!session || (session.status !== "ACTIVE" && session.status !== "SUBMITTING")) return "skipped";

  if (
    isLeaseHeldByOtherWorker({
      processingLock: session.processingLock,
      processingStartedAt: session.processingStartedAt,
      runId,
      now: at,
      leaseMs: OLYMPIAD_FINALIZE_LEASE_MS,
    })
  ) {
    return "skipped";
  }

  await tx.olympiadSession.update({
    where: { id: session.id },
    data: { processingLock: runId, processingStartedAt: at },
  });

  const existingResult = await tx.olympiadResult.findUnique({
    where: { sessionId: session.id },
  });
  if (existingResult) {
    await tx.olympiadSession.update({
      where: { id: session.id },
      data: {
        status: "FINALIZED",
        submittedAt: session.submittedAt ?? existingResult.finalizedAt ?? existingResult.createdAt ?? at,
        finalizedAt: existingResult.finalizedAt ?? existingResult.createdAt ?? at,
        finalizationReason: existingResult.finalizationReason,
        autoFinalized: existingResult.autoFinalized,
        processingLock: null,
        processingStartedAt: null,
      },
    });
    Sentry.addBreadcrumb({
      category: "olympiad.finalize",
      message: "repaired_duplicate_result",
      level: "info",
      data: { sessionId: session.id },
    });
    return "repaired";
  }

  const publishedDefault = session.olympiad.resultVisibility === "IMMEDIATE";

  const disconnectGap = at.getTime() - session.lastSeenAt.getTime();
  const disconnected =
    finalizationReason !== OLYMPIAD_FINALIZATION_REASON.MANUAL_ADMIN_FINALIZE &&
    disconnectGap > OLYMPIAD_DISCONNECT_MS_BEFORE_DEADLINE;

  let effectiveReason: OlympiadFinalizationReason = finalizationReason;
  if (finalizationReason === OLYMPIAD_FINALIZATION_REASON.AUTO_TIMEOUT) {
    effectiveReason = disconnected
      ? OLYMPIAD_FINALIZATION_REASON.DISCONNECTED_TIMEOUT
      : OLYMPIAD_FINALIZATION_REASON.AUTO_TIMEOUT;
  }

  await tx.olympiadViolation.create({
    data: {
      sessionId: session.id,
      type: violationTypeForReason(effectiveReason),
      detailJson: JSON.stringify({
        at: at.toISOString(),
        finalizationReason: effectiveReason,
        serverEndsAt: session.serverEndsAt?.toISOString() ?? null,
        lastSeenAt: session.lastSeenAt.toISOString(),
        disconnectMs: disconnectGap,
        runId,
      }),
    },
  });

  const suspicionInc = effectiveReason === OLYMPIAD_FINALIZATION_REASON.DISCONNECTED_TIMEOUT ? 4 : 0;
  if (suspicionInc > 0) {
    await tx.olympiadSession.update({
      where: { id: session.id },
      data: {
        suspiciousScore: { increment: suspicionInc },
        warningCount: { increment: 1 },
      },
    });
  }

  const sessionFinalizePatch = {
    status: "FINALIZED" as const,
    submittedAt: at,
    finalizedAt: at,
    finalizationReason: effectiveReason,
    autoFinalized: true,
    processingLock: null as string | null,
    processingStartedAt: null as Date | null,
  };

  if (!session.attempt) {
    const base = {
      sessionId: session.id,
      participantId: session.participantId,
      olympiadId: session.olympiadId,
      score: 0,
      maxScore: 0,
      published: publishedDefault,
      approvedAt: publishedDefault ? at : null,
      answersJson: JSON.stringify([]),
      finalizedAt: at,
      finalizationReason: effectiveReason,
      autoFinalized: true,
    };
    await tx.olympiadResult.create({
      data: withSubmissionIntegrityFields(base),
    });
    await tx.olympiadSession.update({
      where: { id: session.id },
      data: sessionFinalizePatch,
    });
    Sentry.addBreadcrumb({
      category: "olympiad.finalize",
      message: "finalized_no_attempt",
      level: "info",
      data: { sessionId: session.id, reason: effectiveReason },
    });
    return "finalized";
  }

  const attempt = session.attempt;
  const test = await tx.test.findUnique({
    where: { id: session.olympiad.testId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!test) {
    const answersJson = attempt.answersJson ?? "[]";
    const base = {
      sessionId: session.id,
      participantId: session.participantId,
      olympiadId: session.olympiadId,
      score: 0,
      maxScore: 0,
      published: publishedDefault,
      approvedAt: publishedDefault ? at : null,
      answersJson,
      finalizedAt: at,
      finalizationReason: effectiveReason,
      autoFinalized: true,
    };
    await tx.olympiadResult.create({
      data: withSubmissionIntegrityFields(base),
    });
    await tx.olympiadSession.update({
      where: { id: session.id },
      data: sessionFinalizePatch,
    });
    return "finalized";
  }

  const order = JSON.parse(attempt.questionOrderJson) as string[];
  const perms = JSON.parse(attempt.optionPermutationsJson) as Record<string, number[]>;
  const displayAnswers = parseOlympiadDisplayAnswers(attempt.answersJson, order.length);
  const { score, maxScore } = scoreOlympiadAttempt(order, perms, displayAnswers, test.questions);

  try {
    await tx.olympiadAttempt.update({
      where: { id: attempt.id },
      data: { answersJson: JSON.stringify(displayAnswers), lastAutoSavedAt: at },
    });
    const answersJson = JSON.stringify(displayAnswers);
    const base = {
      sessionId: session.id,
      participantId: session.participantId,
      olympiadId: session.olympiadId,
      score,
      maxScore,
      published: publishedDefault,
      approvedAt: publishedDefault ? at : null,
      answersJson,
      finalizedAt: at,
      finalizationReason: effectiveReason,
      autoFinalized: true,
    };
    await tx.olympiadResult.create({
      data: withSubmissionIntegrityFields(base),
    });
    await tx.olympiadSession.update({
      where: { id: session.id },
      data: sessionFinalizePatch,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const r = await tx.olympiadResult.findUnique({ where: { sessionId: session.id } });
      await tx.olympiadSession.update({
        where: { id: session.id },
        data: {
          status: "FINALIZED",
          submittedAt: at,
          finalizedAt: r?.finalizedAt ?? r?.createdAt ?? at,
          finalizationReason: r?.finalizationReason,
          autoFinalized: r?.autoFinalized ?? true,
          processingLock: null,
          processingStartedAt: null,
        },
      });
      return "repaired";
    }
    throw e;
  }

  Sentry.addBreadcrumb({
    category: "olympiad.finalize",
    message: "finalized",
    level: "info",
    data: { sessionId: session.id, reason: effectiveReason, score },
  });
  return "finalized";
}

export async function finalizeSessionWithDedicatedTransaction(
  sessionId: string,
  ctx: FinalizeOlympiadSessionTxContext,
): Promise<"finalized" | "skipped" | "repaired"> {
  const out = await prisma.$transaction(
    (tx) => finalizeOlympiadSessionInTx(tx, sessionId, ctx),
    {
      maxWait: 10_000,
      timeout: 25_000,
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    },
  );
  if ((out === "finalized" || out === "repaired") && isOlympiadMonitorRedisEventsEnabled()) {
    const s = await prisma.olympiadSession.findFirst({
      where: { id: sessionId },
      select: { olympiadId: true },
    });
    if (s) {
      void emitOlympiadMonitorEvent({
        type: "exam_state_changed",
        olympiadId: s.olympiadId,
        sessionId,
        meta: { source: "finalize_worker", outcome: out },
      });
    }
  }
  return out;
}

/**
 * Cron/worker: muddati o‘tgan ACTIVE sessiyalar.
 */
export async function runOlympiadOverdueFinalization(options?: {
  now?: Date;
  batchLimit?: number;
  runId?: string;
  maxRounds?: number;
  /** Serverless vaqt budjeti — aylanishlar erta to‘xtaydi (deploy/restart xavfsizligi). */
  deadlineMs?: number;
}): Promise<OlympiadFinalizeWorkerStats & { stoppedEarly?: boolean }> {
  const started = Date.now();
  const deadlineAt = options?.deadlineMs ? started + options.deadlineMs : null;
  const at = options?.now ?? new Date();
  const batchLimit = Math.min(Math.max(1, options?.batchLimit ?? DEFAULT_BATCH), 200);
  const maxRounds = Math.min(Math.max(1, options?.maxRounds ?? MAX_ROUNDS_PER_INVOCATION), 100);
  const runId = options?.runId ?? randomRunId();
  let stoppedEarly = false;

  const overBudget = () => deadlineAt !== null && Date.now() >= deadlineAt;

  let finalized = 0;
  let skipped = 0;
  let repaired = 0;
  let errors = 0;
  let candidatesSeen = 0;
  let rounds = 0;
  let staleSubmittingRounds = 0;
  let staleSubmittingFinalized = 0;
  let staleSubmittingRepaired = 0;

  for (rounds = 0; rounds < maxRounds; rounds++) {
    if (overBudget()) {
      stoppedEarly = true;
      break;
    }
    const candidates = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "OlympiadSession"
      WHERE status IN ('ACTIVE', 'SUBMITTING')
        AND "serverEndsAt" IS NOT NULL
        AND "serverEndsAt" < ${at}
      ORDER BY "serverEndsAt" ASC
      LIMIT ${batchLimit}
    `;

    if (candidates.length === 0) break;

    candidatesSeen += candidates.length;

    for (const row of candidates) {
      if (overBudget()) {
        stoppedEarly = true;
        break;
      }
      try {
        const out = await finalizeSessionWithDedicatedTransaction(row.id, {
          at,
          runId,
          finalizationReason: OLYMPIAD_FINALIZATION_REASON.AUTO_TIMEOUT,
          allowActiveNotOverdue: false,
        });
        if (out === "finalized") finalized += 1;
        else if (out === "repaired") repaired += 1;
        else skipped += 1;
      } catch (err) {
        errors += 1;
        Sentry.captureException(err, {
          tags: { worker: "olympiad-finalize", sessionId: row.id },
          extra: { runId, round: rounds },
        });
        logStructured("error", "olympiad.finalize.session_failed", {
          runId,
          sessionId: row.id,
          round: rounds,
        });
        void pushDeadLetterFinalize({
          sessionId: row.id,
          reason: "auto_timeout_batch_error",
          runId,
        });
        void scheduleFinalizeRetry(row.id, 1);
      }
    }
    if (stoppedEarly) break;
  }

  const staleCutoff = new Date(at.getTime() - OLYMPIAD_STALE_SUBMITTING_LAST_SEEN_MS);

  for (staleSubmittingRounds = 0; staleSubmittingRounds < maxRounds; staleSubmittingRounds++) {
    if (overBudget()) {
      stoppedEarly = true;
      break;
    }
    const stuck = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "OlympiadSession"
      WHERE status = 'SUBMITTING'
        AND "lastSeenAt" < ${staleCutoff}
      ORDER BY "lastSeenAt" ASC
      LIMIT ${batchLimit}
    `;

    if (stuck.length === 0) break;

    candidatesSeen += stuck.length;

    for (const row of stuck) {
      try {
        const out = await finalizeSessionWithDedicatedTransaction(row.id, {
          at,
          runId,
          finalizationReason: OLYMPIAD_FINALIZATION_REASON.STALE_SUBMITTING_RECOVERY,
          allowActiveNotOverdue: true,
        });
        if (out === "finalized") {
          finalized += 1;
          staleSubmittingFinalized += 1;
        } else if (out === "repaired") {
          repaired += 1;
          staleSubmittingRepaired += 1;
        } else skipped += 1;
      } catch (err) {
        errors += 1;
        Sentry.captureException(err, {
          tags: { worker: "olympiad-finalize-stale-submitting", sessionId: row.id },
          extra: { runId, round: staleSubmittingRounds },
        });
        logStructured("error", "olympiad.finalize.stale_submitting_failed", {
          runId,
          sessionId: row.id,
          round: staleSubmittingRounds,
        });
        void pushDeadLetterFinalize({
          sessionId: row.id,
          reason: "stale_submitting_error",
          runId,
          allowActiveNotOverdue: true,
        });
        void scheduleFinalizeRetry(row.id, 1);
      }
    }
  }

  const durationMs = Date.now() - started;

  // WHY: Metric-only — long-idle ACTIVE while deadline not passed may indicate client ghost tabs (no auto-finalize here).
  const ghostActiveSessions = await prisma.olympiadSession.count({
    where: {
      status: "ACTIVE",
      lastSeenAt: { lt: new Date(at.getTime() - 30 * 60 * 1000) },
      serverEndsAt: { gt: at },
    },
  });

  logStructured("info", "olympiad.finalize.run_complete", {
    runId,
    rounds,
    staleSubmittingRounds,
    candidatesSeen,
    finalized,
    skipped,
    repaired,
    staleSubmittingFinalized,
    staleSubmittingRepaired,
    errors,
    durationMs,
    ghostActiveSessions,
    autoFinalized: finalized + repaired,
    stoppedEarly,
  });

  Sentry.addBreadcrumb({
    category: "olympiad.finalize",
    message: "run_complete",
    level: errors > 0 ? "warning" : "info",
    data: {
      runId,
      finalized,
      repaired,
      skipped,
      errors,
      durationMs,
      staleSubmittingFinalized,
      staleSubmittingRepaired,
      ghostActiveSessions,
    },
  });

  try {
    await writeAuditLog({
      actorUserId: null,
      action: "OLYMPIAD_OVERDUE_FINALIZE_RUN",
      entityType: "OlympiadWorker",
      entityId: runId,
      metadata: {
        rounds,
        staleSubmittingRounds,
        candidatesSeen,
        finalized,
        skipped,
        repaired,
        staleSubmittingFinalized,
        staleSubmittingRepaired,
        errors,
        durationMs,
        ghostActiveSessions,
        at: at.toISOString(),
      },
    });
  } catch (e) {
    Sentry.captureException(e, { tags: { worker: "olympiad-finalize-audit" } });
  }

  return {
    runId,
    rounds,
    staleSubmittingRounds,
    candidatesSeen,
    finalized,
    skipped,
    repaired,
    staleSubmittingFinalized,
    staleSubmittingRepaired,
    errors,
    durationMs,
    stoppedEarly,
  };
}

/**
 * Admin: bitta sessiyani majburiy yopish (server-only).
 * `forceEvenIfNotOverdue`: vaqt hali tugamagan ACTIVE sessiyani ham yopish (faqat admin).
 */
export async function runManualOlympiadSessionFinalization(params: {
  sessionId: string;
  actorUserId: string;
  forceEvenIfNotOverdue: boolean;
}): Promise<{ ok: true; outcome: "finalized" | "skipped" | "repaired" } | { ok: false; error: string }> {
  const runId = `adm_${params.actorUserId.slice(0, 8)}_${Date.now().toString(36)}`;
  const at = new Date();
  try {
    const outcome = await finalizeSessionWithDedicatedTransaction(params.sessionId, {
      at,
      runId,
      finalizationReason: OLYMPIAD_FINALIZATION_REASON.MANUAL_ADMIN_FINALIZE,
      allowActiveNotOverdue: params.forceEvenIfNotOverdue,
    });
    await writeAuditLog({
      actorUserId: params.actorUserId,
      action: "OLYMPIAD_MANUAL_FINALIZE_SESSION",
      entityType: "OlympiadSession",
      entityId: params.sessionId,
      metadata: { outcome, forceEvenIfNotOverdue: params.forceEvenIfNotOverdue, at: at.toISOString() },
    });
    return { ok: true, outcome };
  } catch (e) {
    Sentry.captureException(e, { tags: { worker: "olympiad-manual-finalize", sessionId: params.sessionId } });
    return { ok: false, error: "Yakunlashda xato." };
  }
}
