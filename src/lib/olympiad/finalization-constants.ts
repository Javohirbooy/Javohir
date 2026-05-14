/** Olimpiada sessiyasi / natijada saqlanadigan yakunlash sabablari. */
export const OLYMPIAD_FINALIZATION_REASON = {
  AUTO_TIMEOUT: "AUTO_TIMEOUT",
  DISCONNECTED_TIMEOUT: "DISCONNECTED_TIMEOUT",
  MANUAL_ADMIN_FINALIZE: "MANUAL_ADMIN_FINALIZE",
  /** Worker: SUBMITTING holati uzoq vaqt qotib qolganda tiklash */
  STALE_SUBMITTING_RECOVERY: "STALE_SUBMITTING_RECOVERY",
} as const;

export type OlympiadFinalizationReason =
  (typeof OLYMPIAD_FINALIZATION_REASON)[keyof typeof OLYMPIAD_FINALIZATION_REASON];

/** Violation turlari (anti-cheat jurnalida). */
export const OLYMPIAD_FINALIZE_VIOLATION = {
  AUTO_TIMEOUT: "OLYMPIAD_FINALIZE_AUTO_TIMEOUT",
  DISCONNECTED_TIMEOUT: "OLYMPIAD_FINALIZE_DISCONNECTED_TIMEOUT",
  MANUAL_ADMIN: "OLYMPIAD_FINALIZE_MANUAL_ADMIN",
  STALE_SUBMITTING: "OLYMPIAD_FINALIZE_STALE_SUBMITTING",
} as const;

/** Worker lease: shu vaqt o‘tgach boshqa ishchi qayta olishi mumkin. */
export const OLYMPIAD_FINALIZE_LEASE_MS = 4 * 60 * 1000;

/** DISCONNECTED_TIMEOUT aniqlash uchun `lastSeenAt` oralig‘i. */
export const OLYMPIAD_DISCONNECT_MS_BEFORE_DEADLINE = 90_000;

/** SUBMITTING qotib qolgan sessiyalarni tiklash: `lastSeenAt` bundan eski bo‘lsa. */
export const OLYMPIAD_STALE_SUBMITTING_LAST_SEEN_MS = 10 * 60 * 1000;
