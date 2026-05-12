type CacheEntry<T> = { value: T; expiresAt: number };

const store = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 8_000;

/**
 * Process-local memo cache for leaderboard payloads (per contest).
 * For multi-instance scale-out, back with Redis / CDN stale-while-revalidate.
 */
export function getCachedLeaderboard<T>(contestId: string, factory: () => T, ttlMs = DEFAULT_TTL_MS): T {
  const key = `leaderboard:${contestId}`;
  const now = Date.now();
  const hit = store.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expiresAt > now) {
    return hit.value;
  }
  const value = factory();
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

export function invalidateLeaderboardCache(contestId: string): void {
  store.delete(`leaderboard:${contestId}`);
}
