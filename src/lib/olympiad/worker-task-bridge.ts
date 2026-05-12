/**
 * Kelajakdagi navbat (BullMQ / SQS / Cloud Tasks) uchun no-op adapter.
 * Hozirgi cron + DB lease yakunlash oqimi o‘zgartirilmaydi.
 */
export type OlympiadWorkerTask = { kind: "finalize_overdue"; runId?: string };

export async function enqueueOlympiadWorkerTask(task: OlympiadWorkerTask): Promise<void> {
  void task;
}
