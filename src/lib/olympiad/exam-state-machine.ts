/**
 * Olimpiada imtihon sessiyasi holatlari (server ixtiyoriy qator `OlympiadSession.status`).
 * RULES_PENDING — qoidalardan oldin (join keyingi bosqich).
 */

export const OLYMPIAD_EXAM_STATES = [
  "RULES_PENDING",
  "WAITING",
  "ACTIVE",
  "SUBMITTING",
  "SUBMITTED",
  "FINALIZED",
  "EXPIRED",
] as const;

export type OlympiadExamSessionStatus = (typeof OLYMPIAD_EXAM_STATES)[number];

/** Imtihon tugagan / natija qulflangan (UI va redirectlar uchun). */
export function isOlympiadExamTerminalStatus(status: string): boolean {
  return status === "SUBMITTED" || status === "FINALIZED" || status === "EXPIRED";
}

/** Faol imtihon (monitoring: uzilish hisobi). */
export function isOlympiadExamInProgressStatus(status: string): boolean {
  return status === "ACTIVE" || status === "WAITING" || status === "SUBMITTING";
}

const ALLOWED: Record<string, readonly string[]> = {
  RULES_PENDING: ["WAITING"],
  WAITING: ["ACTIVE"],
  ACTIVE: ["SUBMITTING", "ACTIVE"],
  SUBMITTING: ["FINALIZED", "ACTIVE"],
  SUBMITTED: ["FINALIZED"],
  FINALIZED: [],
  EXPIRED: [],
};

/**
 * Server-nazorat: ruxsat etilgan o‘tish yoki `null` (o‘tkazmaslik).
 * `to` holatiga o‘tishdan oldin chaqiriladi.
 */
export function assertOlympiadExamStateTransition(from: string, to: string): { ok: true } | { ok: false; reason: string } {
  if (from === to) return { ok: true };
  const next = ALLOWED[from];
  if (!next?.includes(to)) {
    return { ok: false, reason: `invalid_transition:${from}->${to}` };
  }
  return { ok: true };
}
