import { logStructured } from "@/lib/logger";
import { isOlympiadAnswerSigningEnabled, isOlympiadSigningStrict } from "@/lib/olympiad/feature-flags";
import type { OlympiadAnswerSigningPayload } from "@/lib/olympiad/exam-types";

export type { OlympiadAnswerSigningPayload } from "@/lib/olympiad/exam-types";

function authSecretOk(): boolean {
  const s = process.env.AUTH_SECRET?.trim();
  const min = isOlympiadSigningStrict() ? 24 : 16;
  return Boolean(s && s.length >= min);
}

/**
 * Imzo yoqilganda: faqat monotonik `seq` + serverda `OlympiadAttempt.autosaveSeq` bilan atomik tekshiruv.
 * HMAC kalit brauzerga berilmaydi (XSS himoyasi).
 */
export async function verifyOlympiadSignedAnswerPayload(
  _sessionId: string,
  _answers: number[],
  signing: OlympiadAnswerSigningPayload | null | undefined,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isOlympiadAnswerSigningEnabled()) return { ok: true };

  if (!authSecretOk()) {
    void logStructured("error", "olympiad.signing_auth_secret_missing", {});
    return { ok: false, error: "Server sozlamasi: AUTH_SECRET talab qilinadi." };
  }

  // WHY: Strict integer bounds stop float / huge-seq abuse and keep DB `autosaveSeq` comparisons well-defined.
  const MAX_CLIENT_SEQ = 50_000_000;
  if (!signing || !Number.isInteger(signing.seq) || signing.seq < 1 || signing.seq > MAX_CLIENT_SEQ) {
    return { ok: false, error: "Imzolanmagan yoki noto‘liq javob paketi (seq)." };
  }

  return { ok: true };
}
