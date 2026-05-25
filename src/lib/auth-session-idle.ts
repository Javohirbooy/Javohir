import type { JWT } from "next-auth/jwt";

/** Faoliyatsizlikdan keyin sessiya tugashi (1 soat). */
export const SESSION_IDLE_MS = 60 * 60 * 1000;

export const SESSION_IDLE_SECONDS = SESSION_IDLE_MS / 1000;

/** JWT ichida oxirgi faollik va muddati tugagan belgisi. */
export function applySessionIdleToJwtToken(token: JWT, opts: { isNewSignIn: boolean }): JWT {
  const now = Date.now();
  if (opts.isNewSignIn) {
    return { ...token, lastActivityAt: now, sessionIdleExpired: false };
  }

  const last = typeof token.lastActivityAt === "number" ? token.lastActivityAt : now;
  if (now - last > SESSION_IDLE_MS) {
    return { ...token, sessionIdleExpired: true };
  }

  return { ...token, lastActivityAt: now, sessionIdleExpired: false };
}

export function isSessionIdleExpired(token: JWT | null | undefined): boolean {
  return Boolean(token?.sessionIdleExpired);
}
