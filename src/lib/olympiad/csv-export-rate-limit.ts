/**
 * Lightweight in-process rate limiter for expensive CSV exports.
 *
 * WHY: Serverless instances can scale horizontally; per-instance limiting still
 * caps abuse bursts and protects DB from rapid repeated full scans by one actor.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 6;
const hits = new Map<string, number[]>();

export function allowOlympiadCsvExport(userId: string): boolean {
  const now = Date.now();
  const key = userId;
  const arr = hits.get(key) ?? [];
  const pruned = arr.filter((t) => now - t < WINDOW_MS);
  if (pruned.length >= MAX_PER_WINDOW) return false;
  pruned.push(now);
  hits.set(key, pruned);
  return true;
}
