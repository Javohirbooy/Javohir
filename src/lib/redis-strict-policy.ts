/**
 * Production distributed security: Upstash Redis majburiy bo‘lgan rejim.
 * `ALLOW_MEMORY_RATE_LIMIT=1` yoki E2E flaglari — faqat dev/CI/test.
 */
export function allowMemoryRateLimitEscape(): boolean {
  return (
    process.env.ALLOW_MEMORY_RATE_LIMIT === "1" ||
    process.env.E2E_RELAX_DISTRIBUTED_RATE_LIMIT === "1" ||
    process.env.E2E_RELAX_SERVER_ACTION_RATE_LIMIT === "1"
  );
}

/** `next build` / SSG — Redis fetch Dynamic Server Usage ga tushmasin. */
export function isNextProductionBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

/**
 * Production runtime: tarqalgan limiter talab qilinadi (xotira fallback yo‘q).
 * Build fazasida har doim false (SSG/build barqarorligi).
 */
export function isStrictDistributedRateLimitPolicy(): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  if (isNextProductionBuildPhase()) return false;
  if (allowMemoryRateLimitEscape()) return false;
  return true;
}

/**
 * Vercel yoki majburiy self-host: ishga tushishda Redis borligini tekshirish.
 */
export function mustEnforceDistributedRedisAtStartup(): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  if (allowMemoryRateLimitEscape()) return false;
  return process.env.VERCEL === "1" || process.env.ENFORCE_DISTRIBUTED_RATE_LIMIT === "1";
}
