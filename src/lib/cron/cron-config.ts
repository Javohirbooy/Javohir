/** Redis/DB lock kalitlari — barcha cron finalization bir lock ostida (overlap oldini olish). */
export const CRON_LOCK = {
  olympiadFinalize: "iq:cron:lock:olympiad_finalize",
  uptimePing: "iq:cron:lock:uptime_ping",
} as const;

/** Vercel `maxDuration` dan biroz qisqaroq — lock avtomatik qolmasin. */
export const CRON_LOCK_TTL_SEC = {
  olympiadFinalize: 100,
  uptimePing: 25,
} as const;

/** Serverless vaqt budjeti (ms) — finalize worker erta to‘xtaydi. */
export const CRON_FINALIZE_BUDGET_MS = {
  tick: 95_000,
  nightly: 110_000,
} as const;

export type CronJobName = "keep-alive" | "tick" | "olympiad-finalize" | "watchdog";
