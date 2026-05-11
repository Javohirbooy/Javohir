/** HttpOnly cookie: opaque session token (DBda faqat hash). */
export const OLYMPIAD_SESSION_COOKIE = "iqm_olympiad_sess";

export const OLYMPIAD_JOIN_RATE_WINDOW_MS = 15 * 60 * 1000;
export const OLYMPIAD_JOIN_RATE_MAX = 30;

/** Server-only pepper suffix for code hashing (asosiy sir `AUTH_SECRET`). */
export const OLYMPIAD_CODE_PEPPER = "iqm.olympiad.code.v1";
