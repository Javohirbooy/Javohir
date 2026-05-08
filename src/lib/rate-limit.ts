type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function now() {
  return Date.now();
}

/**
 * Lightweight in-memory rate limiter.
 * Note: per-instance only; for multi-instance prod use Redis/Upstash.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterMs: number } {
  const ts = now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= ts) {
    buckets.set(key, { count: 1, resetAt: ts + windowMs });
    return { ok: true, retryAfterMs: 0 };
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfterMs: bucket.resetAt - ts };
  }
  bucket.count += 1;
  buckets.set(key, bucket);
  return { ok: true, retryAfterMs: 0 };
}
