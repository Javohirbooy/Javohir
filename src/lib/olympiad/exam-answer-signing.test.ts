import { describe, expect, it } from "vitest";
import { createHmac } from "crypto";
import { canonicalOlympiadAnswerBody, verifyOlympiadAnswerSignature } from "@/lib/olympiad/exam-answer-signing";

describe("exam-answer-signing", () => {
  it("canonical body matches verify path", () => {
    const sid = "sess_test";
    const seq = 3;
    const answers = [1, 0, -1, 2];
    const body = canonicalOlympiadAnswerBody(sid, seq, answers);
    expect(body).toBe(JSON.stringify({ v: 1, sid, seq, a: answers }));
  });

  it("verify accepts valid HMAC", () => {
    const keyHex = "ab".repeat(32);
    const sid = "s1";
    const seq = 1;
    const answers = [0, 1];
    const body = canonicalOlympiadAnswerBody(sid, seq, answers);
    const sigHex = createHmac("sha256", Buffer.from(keyHex, "hex")).update(body, "utf8").digest("hex");
    expect(verifyOlympiadAnswerSignature(keyHex, sid, seq, answers, sigHex)).toBe(true);
  });

  it("verify rejects tampered answers", () => {
    const keyHex = "cd".repeat(32);
    const sid = "s1";
    const seq = 1;
    const answers = [0, 1];
    const body = canonicalOlympiadAnswerBody(sid, seq, answers);
    const sigHex = createHmac("sha256", Buffer.from(keyHex, "hex")).update(body, "utf8").digest("hex");
    expect(verifyOlympiadAnswerSignature(keyHex, sid, seq, [1, 0], sigHex)).toBe(false);
  });
});
