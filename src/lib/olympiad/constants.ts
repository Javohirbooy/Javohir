/** HttpOnly cookie: opaque session token (DBda faqat hash). */
export const OLYMPIAD_SESSION_COOKIE = "iqm_olympiad_sess";

export const OLYMPIAD_JOIN_RATE_WINDOW_MS = 15 * 60 * 1000;
export const OLYMPIAD_JOIN_RATE_MAX = 30;

/** Sertifikat jamoat tekshiruvi (IP bo‘yicha, qattiq Redis rejimida talab qilinadi). */
export const OLYMPIAD_CERT_VERIFY_RATE_WINDOW_MS = 60 * 1000;
export const OLYMPIAD_CERT_VERIFY_RATE_MAX = 40;

/** Violation yozuvlari (sessionId+type) uchun sliding window. */
export const OLYMPIAD_VIOLATION_RL_WINDOW_MS = 60 * 1000;
export const OLYMPIAD_VIOLATION_RL_MAX = 24;

/** Jonli monitor: shubxa balli ogohlantirish chegara (dashboard bilan bir xil). */
export const OLYMPIAD_SUSPICIOUS_SCORE_ALERT_THRESHOLD = 8;

/** Server-only pepper suffix for code hashing (asosiy sir `AUTH_SECRET`). */
export const OLYMPIAD_CODE_PEPPER = "iqm.olympiad.code.v1";
