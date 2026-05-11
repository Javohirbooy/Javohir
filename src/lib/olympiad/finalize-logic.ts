/**
 * Worker va testlar uchun saf funksiyalar (Prisma yo‘q).
 */

export function parseOlympiadDisplayAnswers(raw: string | null | undefined, len: number): number[] {
  let arr: number[] = [];
  if (raw) {
    try {
      arr = JSON.parse(raw) as number[];
    } catch {
      arr = [];
    }
  }
  while (arr.length < len) arr.push(-1);
  return arr.slice(0, len);
}

export function pickWorkerFinalizationReason(disconnected: boolean): "AUTO_TIMEOUT" | "DISCONNECTED_TIMEOUT" {
  return disconnected ? "DISCONNECTED_TIMEOUT" : "AUTO_TIMEOUT";
}

export function isLeaseHeldByOtherWorker(params: {
  processingLock: string | null;
  processingStartedAt: Date | null;
  runId: string;
  now: Date;
  leaseMs: number;
}): boolean {
  const { processingLock, processingStartedAt, runId, now, leaseMs } = params;
  if (!processingLock || !processingStartedAt) return false;
  if (processingLock === runId) return false;
  const staleBefore = now.getTime() - leaseMs;
  return processingStartedAt.getTime() > staleBefore;
}
