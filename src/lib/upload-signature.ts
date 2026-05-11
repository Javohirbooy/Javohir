import { createHmac, timingSafeEqual } from "crypto";

type UploadClaims = {
  uid: string;
  purpose: "profile_avatar";
  exp: number;
};

function secret(): string {
  const s = process.env.AUTH_SECRET?.trim();
  if (process.env.NODE_ENV === "production") {
    if (!s || s.length < 32) {
      throw new Error("[upload-signature] Production: AUTH_SECRET majburiy (kamida 32 belgi).");
    }
    return s;
  }
  return s ?? "dev-upload-secret-change-me";
}

function b64(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function unb64(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createUploadToken(claims: UploadClaims): string {
  const payload = b64(JSON.stringify(claims));
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function verifyUploadToken(token: string): UploadClaims | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(unb64(payload)) as UploadClaims;
    if (!parsed.uid || parsed.purpose !== "profile_avatar" || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}
