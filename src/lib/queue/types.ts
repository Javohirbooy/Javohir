export type FinalizeQueueMessage = {
  kind: "finalize_session";
  sessionId: string;
  runId?: string;
  allowActiveNotOverdue?: boolean;
  idempotencyKey?: string;
};

export type FinalizeOverdueQueueMessage = {
  kind: "finalize_overdue_batch";
  runId?: string;
  batchLimit?: number;
  maxRounds?: number;
};

export type WorkerQueueMessage = FinalizeQueueMessage | FinalizeOverdueQueueMessage;

export type PublishResult = { ok: true; messageId?: string } | { ok: false; error: string };
