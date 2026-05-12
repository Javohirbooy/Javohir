import { describe, expect, it } from "vitest";
import { looksLikeCertificateVerifyPublicId } from "@/lib/olympiad/certificate-service";

describe("looksLikeCertificateVerifyPublicId", () => {
  it("accepts typical cert_ ids", () => {
    expect(looksLikeCertificateVerifyPublicId("cert_abcdefghijklmnopqrstuvwxyz12")).toBe(true);
    expect(looksLikeCertificateVerifyPublicId("  cert_AbCdEf1234-_  ")).toBe(true);
  });

  it("rejects wrong prefix or length", () => {
    expect(looksLikeCertificateVerifyPublicId("")).toBe(false);
    expect(looksLikeCertificateVerifyPublicId("cert_short")).toBe(false);
    expect(looksLikeCertificateVerifyPublicId("other_AbCdEf1234567890123456789012")).toBe(false);
    expect(looksLikeCertificateVerifyPublicId("cert_" + "a".repeat(200))).toBe(false);
  });
});
