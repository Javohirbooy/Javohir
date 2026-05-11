/** Olimpiada sessiyasi / natijada saqlanadigan yakunlash sabablari. */
export const OLYMPIAD_FINALIZATION_REASON = {
  AUTO_TIMEOUT: "AUTO_TIMEOUT",
  DISCONNECTED_TIMEOUT: "DISCONNECTED_TIMEOUT",
  MANUAL_ADMIN_FINALIZE: "MANUAL_ADMIN_FINALIZE",
} as const;

export type OlympiadFinalizationReason =
  (typeof OLYMPIAD_FINALIZATION_REASON)[keyof typeof OLYMPIAD_FINALIZATION_REASON];

/** Violation turlari (anti-cheat jurnalida). */
export const OLYMPIAD_FINALIZE_VIOLATION = {
  AUTO_TIMEOUT: "OLYMPIAD_FINALIZE_AUTO_TIMEOUT",
  DISCONNECTED_TIMEOUT: "OLYMPIAD_FINALIZE_DISCONNECTED_TIMEOUT",
  MANUAL_ADMIN: "OLYMPIAD_FINALIZE_MANUAL_ADMIN",
} as const;

/** Worker lease: shu vaqt o‘tgach boshqa ishchi qayta olishi mumkin. */
export const OLYMPIAD_FINALIZE_LEASE_MS = 4 * 60 * 1000;

/** DISCONNECTED_TIMEOUT aniqlash uchun `lastSeenAt` oralig‘i. */
export const OLYMPIAD_DISCONNECT_MS_BEFORE_DEADLINE = 90_000;
