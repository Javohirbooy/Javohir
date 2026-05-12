/** Olimpiada xavfsizlik / masshtab — server-only env bayroqlari (default: xavfsiz konservativ). */

export function isOlympiadAnswerSigningEnabled(): boolean {
  return process.env.OLYMPIAD_ANSWER_SIGNING === "1";
}

/**
 * Qattiq imzo rejimi: `AUTH_SECRET` noto‘g‘ri yoki seq yo‘q bo‘lsa rad.
 * (Redis seq ixtiyoriy; asosiy atomiklik DB `autosaveSeq` ustida.)
 */
export function isOlympiadSigningStrict(): boolean {
  return process.env.OLYMPIAD_SIGNING_STRICT === "1";
}

/** @deprecated Redis seq o‘rniga DB `autosaveSeq` ishlatiladi; muhit orqali hali o‘qilishi mumkin. */
export function isOlympiadAnswerSigningRequireRedisSeq(): boolean {
  return process.env.OLYMPIAD_SIGNING_REQUIRE_REDIS_SEQ === "1";
}

export function isOlympiadExamWatermarkEnabled(): boolean {
  return process.env.OLYMPIAD_EXAM_WATERMARK === "1";
}

export function isOlympiadMultiTabDetectionEnabled(): boolean {
  return process.env.OLYMPIAD_MULTI_TAB_DETECT === "1";
}

export function isOlympiadMonitorSseEnabled(): boolean {
  return process.env.OLYMPIAD_MONITOR_SSE === "1";
}

/** Olimpiada natijalarini nashr qilishda `autoFinalized` qatorlarga ham reyting berish. */
export function isOlympiadPublishIncludeAutoFinalized(): boolean {
  return process.env.OLYMPIAD_PUBLISH_RANK_AUTO_FINALIZED === "1";
}

/** Jonli monitoring: Redis event oqimi (SSE ga qo‘shiladi). */
export function isOlympiadMonitorRedisEventsEnabled(): boolean {
  return process.env.OLYMPIAD_MONITOR_REDIS_EVENTS === "1";
}

/** SSE ichida DB snapshot har tick o‘rniga seyrek (Redis eventlar bilan). */
export function isOlympiadMonitorDbSnapshotSparseEnabled(): boolean {
  return process.env.OLYMPIAD_MONITOR_SPARSE_DB_SNAPSHOT === "1";
}
