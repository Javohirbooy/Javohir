/**
 * Upstash Redis kalit sxemasi (cron + queue + observability).
 *
 * | Key pattern | Type | TTL | Purpose |
 * |-------------|------|-----|---------|
 * | iq:cron:lock:{name} | STRING | job TTL | Distributed mutex |
 * | iq:cron:idem:{job}:{key} | STRING | 1h | Invocation dedup |
 * | iq:worker:cron:lastRun | HASH | 14d | Per-job last status |
 * | iq:worker:olympiad_finalize:lastOk | STRING | 14d | Finalize heartbeat |
 * | iq:worker:uptime_keepalive:lastOk | STRING | 14d | Uptime heartbeat |
 * | iq:queue:dlq:finalize | LIST | — | Failed session IDs (JSON) |
 * | iq:queue:retry:finalize | ZSET | — | score=retryAtMs, member=sessionId |
 * | iq:metrics:cron:{job} | STRING | 24h | Last duration/errors snapshot |
 */
export const REDIS_KEYS = {
  cronLock: (name: string) => `iq:cron:lock:${name}`,
  cronIdempotency: (job: string, key: string) => `iq:cron:idem:${job}:${key}`,
  cronLastRun: "iq:worker:cron:lastRun",
  olympiadFinalizeHeartbeat: "iq:worker:olympiad_finalize:lastOk",
  uptimeHeartbeat: "iq:worker:uptime_keepalive:lastOk",
  dlqFinalize: "iq:queue:dlq:finalize",
  retryFinalize: "iq:queue:retry:finalize",
  metricsCron: (job: string) => `iq:metrics:cron:${job}`,
} as const;
