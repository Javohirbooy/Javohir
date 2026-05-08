import { createHash, randomBytes } from "crypto";

export const AUTH_TOKEN_TYPE = {
  EMAIL_VERIFY: "EMAIL_VERIFY",
  PASSWORD_RESET: "PASSWORD_RESET",
} as const;

/** Clientga yuboriladigan token; DBda faqat SHA-256 hash saqlanadi. */
export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
