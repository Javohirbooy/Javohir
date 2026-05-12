type CacheEntry<T> = { value: T; expiresAt: number };

const store = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 10_000;

/** Short-lived contest snapshot (problems, metadata) keyed by contest id. */
export function getCachedContestSnapshot<T>(contestId: string, factory: () => T, ttlMs = DEFAULT_TTL_MS): T {
  const key = `contest:${contestId}`;
  const now = Date.now();
  const hit = store.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expiresAt > now) {
    return hit.value;
  }
  const value = factory();
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

export function invalidateContestSnapshotCache(contestId: string): void {
  store.delete(`contest:${contestId}`);
}
