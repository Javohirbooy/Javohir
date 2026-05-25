import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { isAuthorizedCron } from "@/lib/cron/authorize";
import { finalizeSessionWithDedicatedTransaction } from "@/lib/olympiad/finalize-overdue-worker";
import { OLYMPIAD_FINALIZATION_REASON } from "@/lib/olympiad/finalization-constants";
import { logStructured } from "@/lib/logger";
import { pushDeadLetterFinalize } from "@/lib/queue/dead-letter";
import type { FinalizeQueueMessage } from "@/lib/queue/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * QStash / kelajakdagi queue consumer — bitta sessiya finalize.
 * Himoya: CRON_SECRET (Bearer) yoki QStash signature (keyingi bosqich).
 */
export async function POST(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: FinalizeQueueMessage;
  try {
    body = (await req.json()) as FinalizeQueueMessage;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (body.kind !== "finalize_session" || !body.sessionId?.trim()) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const runId = body.runId ?? `q_${Date.now().toString(36)}`;
  const at = new Date();

  try {
    const outcome = await finalizeSessionWithDedicatedTransaction(body.sessionId.trim(), {
      at,
      runId,
      finalizationReason: OLYMPIAD_FINALIZATION_REASON.AUTO_TIMEOUT,
      allowActiveNotOverdue: body.allowActiveNotOverdue ?? false,
    });

    logStructured("info", "worker.finalize_session", {
      sessionId: body.sessionId,
      outcome,
      runId,
    });

    return NextResponse.json({ ok: true, outcome, runId });
  } catch (e) {
    Sentry.captureException(e, { tags: { worker: "finalize-session", sessionId: body.sessionId } });
    await pushDeadLetterFinalize({
      sessionId: body.sessionId,
      reason: "queue_consumer_error",
      runId,
    });
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
