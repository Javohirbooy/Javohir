import { createHash, randomBytes } from "crypto";
import { OLYMPIAD_CODE_PEPPER } from "@/lib/olympiad/constants";

export function normalizeOlympiadCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

function serverPepper(): string {
  const s = process.env.AUTH_SECRET?.trim();
  if (!s || s.length < 16) {
    throw new Error("[olympiad] AUTH_SECRET majburiy (kod xeshlari uchun).");
  }
  return `${OLYMPIAD_CODE_PEPPER}:${s}`;
}

export function hashOlympiadCode(normalized: string): string {
  return createHash("sha256").update(serverPepper()).update("|").update(normalized).digest("hex");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(serverPepper()).update("|sess|").update(token).digest("hex");
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function codeHintFromNormalized(normalized: string): string {
  if (normalized.length <= 4) return "****";
  return `…${normalized.slice(-4)}`;
}
