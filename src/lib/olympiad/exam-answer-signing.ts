import { createHmac, timingSafeEqual } from "crypto";

const ANSWER_PEPPER = "iqm.olympiad.answer_hmac.v1";

/** Brauzer va server bir xil canonical JSON (UTF-8). */
export function canonicalOlympiadAnswerBody(sessionId: string, seq: number, answers: number[]): string {
  return JSON.stringify({ v: 1, sid: sessionId, seq, a: answers });
}

/**
 * Sessiya + cookie token xeshidan 32 baytli HMAC kalit (hex).
 * Brauzerga faqat HTTPS orqali bir marta beriladi — XSS bo‘lsa xavf barqaror.
 */
export function tryDeriveOlympiadAnswerKeyHex(sessionId: string, sessionTokenHash: string): string | null {
  const s = process.env.AUTH_SECRET?.trim();
  if (!s || s.length < 16) return null;
  const raw = createHmac("sha256", `${ANSWER_PEPPER}:${s}`)
    .update("v1|key|")
    .update(sessionId)
    .update("|")
    .update(sessionTokenHash)
    .digest();
  return raw.toString("hex");
}

export function verifyOlympiadAnswerSignature(
  keyHex: string,
  sessionId: string,
  seq: number,
  answers: number[],
  sigHex: string,
): boolean {
  try {
    const body = canonicalOlympiadAnswerBody(sessionId, seq, answers);
    const key = Buffer.from(keyHex, "hex");
    if (key.length !== 32) return false;
    const mac = createHmac("sha256", key).update(body, "utf8").digest();
    const got = Buffer.from(sigHex.trim(), "hex");
    if (got.length !== mac.length) return false;
    return timingSafeEqual(mac, got);
  } catch {
    return false;
  }
}
