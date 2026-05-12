import { createHash, createHmac, timingSafeEqual } from "crypto";

const PEPPER = "iqm.olympiad.submission_integrity.v1";

function submissionIntegritySecret(): string | null {
  const dedicated = process.env.OLYMPIAD_SUBMISSION_INTEGRITY_SECRET?.trim();
  if (dedicated && dedicated.length >= 24) return dedicated;
  const auth = process.env.AUTH_SECRET?.trim();
  if (auth && auth.length >= 16) return auth;
  return null;
}

export type SubmissionIntegrityPayloadV1 = {
  v: 1;
  sessionId: string;
  olympiadId: string;
  participantId: string;
  score: number;
  maxScore: number;
  answersSha256: string;
  finalizedAtIso: string;
};

export function canonicalSubmissionPayloadV1(p: SubmissionIntegrityPayloadV1): string {
  return JSON.stringify(p);
}

export function sha256HexUtf8(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

export function signSubmissionIntegrityV1(p: SubmissionIntegrityPayloadV1): { sigHex: string; canonicalSha256: string } | null {
  const secret = submissionIntegritySecret();
  if (!secret) return null;
  const canonical = canonicalSubmissionPayloadV1(p);
  const canonicalSha256 = sha256HexUtf8(canonical);
  const sigHex = createHmac("sha256", `${PEPPER}:${secret}`).update(canonical, "utf8").digest("hex");
  return { sigHex, canonicalSha256 };
}

export function verifySubmissionIntegrityV1(
  p: SubmissionIntegrityPayloadV1,
  expectedSigHex: string,
  expectedCanonicalSha256: string,
): boolean {
  const secret = submissionIntegritySecret();
  if (!secret) return false;
  const canonical = canonicalSubmissionPayloadV1(p);
  const canonicalSha256 = sha256HexUtf8(canonical);
  if (canonicalSha256 !== expectedCanonicalSha256) return false;
  const sigHex = createHmac("sha256", `${PEPPER}:${secret}`).update(canonical, "utf8").digest("hex");
  try {
    const a = Buffer.from(sigHex, "hex");
    const b = Buffer.from(expectedSigHex.trim(), "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
