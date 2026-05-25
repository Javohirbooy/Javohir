import { publishWorkerMessage } from "@/lib/queue/publisher";
import type { FinalizeOverdueQueueMessage, FinalizeQueueMessage } from "@/lib/queue/types";

export type OlympiadWorkerTask =
  | { kind: "finalize_overdue"; runId?: string }
  | { kind: "finalize_session"; sessionId: string; runId?: string };

export async function enqueueOlympiadWorkerTask(task: OlympiadWorkerTask): Promise<void> {
  if (task.kind === "finalize_session") {
    const msg: FinalizeQueueMessage = {
      kind: "finalize_session",
      sessionId: task.sessionId,
      runId: task.runId,
    };
    await publishWorkerMessage(msg);
    return;
  }
  const msg: FinalizeOverdueQueueMessage = {
    kind: "finalize_overdue_batch",
    runId: task.runId,
  };
  await publishWorkerMessage(msg);
}
