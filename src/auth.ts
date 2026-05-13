import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import type { AppRole } from "@/lib/app-role";
import { resolvePermissionKeysForRole } from "@/lib/permissions";
import { authConfig } from "@/auth.config";
import {
  clearLoginAttempts,
  isLoginBlocked,
  loginFingerprint,
  registerFailedAttempt,
} from "@/lib/auth-lockout";
import { takeRateLimitSlot } from "@/lib/distributed-rate-limit";
import { validateServerEnv } from "@/lib/env";
import { logStructured } from "@/lib/logger";
import { getClientIpFromHeaders, getRequestIdFromHeaders } from "@/lib/request-context";
import { logSecurityEvent } from "@/lib/security-events";
import {
  LOGIN_IP_MAX_ATTEMPTS,
  LOGIN_IP_WINDOW_MS,
  LOGIN_RATE_LIMIT_ATTEMPTS,
  LOGIN_RATE_LIMIT_WINDOW_MS,
} from "@/lib/auth-rate-limits";
import {
  LoginAccountInactive,
  LoginAmbiguousName,
  LoginEmailNotVerified,
  LoginLockout,
  LoginRateLimited,
  LoginRedisUnavailable,
  LoginUnsupportedPasswordHash,
} from "@/lib/auth-login-errors";

const credentialsSchema = z.object({
  identifier: z.string().trim().min(1),
  /** Nusxa-qog‘ozdan yoki brauzer avto-to‘ldirishidan kelgan bosh/oxiridagi bo‘shliqlarni olib tashlash. */
  password: z.string().trim().min(1),
});

const STUDENT_NUMBER_JWT_SYNC_MS = 30 * 60 * 1000;
const BCRYPT_PREFIX = "$2";
const studentNumberCache = new Map<string, { value?: number; at: number }>();

const envCheck = validateServerEnv();
if (!envCheck.ok && process.env.NODE_ENV !== "production") {
  console.warn("[env] invalid server env", envCheck.errors);
}

const authorizeUserSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  passwordHash: true,
  role: true,
  status: true,
  locale: true,
  mustChangePassword: true,
  studentNumber: true,
  emailVerified: true,
} as const;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        identifier: { label: "Email yoki ism-familiya", type: "text" },
        password: { label: "Parol", type: "password" },
      },
      authorize: async (raw) => {
        if (process.env.IQM_AUTH_DEBUG === "1") {
          const identifierPreview = typeof raw?.identifier === "string" ? raw.identifier : undefined;
          const hasPassword = typeof raw?.password === "string" && raw.password.length > 0;
          console.info("[iqm-auth] credentials received", { identifierPreview, hasPassword });
        }
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) {
          logStructured("warn", "auth.credentials_reject", { stage: "validation", detail: "schema" });
          if (process.env.IQM_AUTH_DEBUG === "1") {
            console.warn("[iqm-auth] credentials parse failed", parsed.error.flatten().fieldErrors);
          }
          return null;
        }
        const identifier = parsed.data.identifier.trim();
        const normalizedIdentifier = identifier.toLowerCase();
        const password = parsed.data.password;

        const [ip, requestId] = await Promise.all([getClientIpFromHeaders(), getRequestIdFromHeaders()]);
        const fp = loginFingerprint(ip, normalizedIdentifier);
        const ipRlCap = ip === "unknown" ? Math.max(LOGIN_IP_MAX_ATTEMPTS * 5, 2000) : LOGIN_IP_MAX_ATTEMPTS;

        if (await isLoginBlocked(fp)) {
          logStructured("warn", "auth.login_blocked", { fpPrefix: fp.slice(0, 8) });
          logSecurityEvent("auth.blocked", { fpPrefix: fp.slice(0, 8) });
          throw new LoginLockout();
        }

        const ipRl = await takeRateLimitSlot("auth_login_ip", ip, ipRlCap, LOGIN_IP_WINDOW_MS, {
          requireDistributed: true,
          requestId,
        });
        if (!ipRl.ok) {
          logStructured("warn", "auth.login_rate_limited_ip", {
            retryAfterMs: ipRl.retryAfterMs,
            backend: ipRl.backend,
          });
          logSecurityEvent("auth.suspicious", { scope: "ip", backend: ipRl.backend });
          throw ipRl.backend === "redis_unavailable" ? new LoginRedisUnavailable() : new LoginRateLimited();
        }

        const userRl = await takeRateLimitSlot("auth_login_user", normalizedIdentifier, LOGIN_RATE_LIMIT_ATTEMPTS, LOGIN_RATE_LIMIT_WINDOW_MS, {
          requireDistributed: true,
          requestId,
        });
        if (!userRl.ok) {
          logStructured("warn", "auth.login_rate_limited_user", {
            mode: normalizedIdentifier.includes("@") ? "email" : "name",
            retryAfterMs: userRl.retryAfterMs,
            backend: userRl.backend,
          });
          logSecurityEvent("auth.suspicious", { scope: "identifier", backend: userRl.backend });
          throw userRl.backend === "redis_unavailable" ? new LoginRedisUnavailable() : new LoginRateLimited();
        }

        const emailLike = normalizedIdentifier.includes("@");
        const users = emailLike
          ? await prisma.user.findMany({
              where: { email: normalizedIdentifier },
              take: 2,
              select: authorizeUserSelect,
            })
          : await prisma.user.findMany({
              where: { name: { equals: identifier, mode: "insensitive" } },
              orderBy: { createdAt: "asc" },
              take: 2,
              select: authorizeUserSelect,
            });
        const user = users[0];
        if (!user) {
          logStructured("warn", "auth.credentials_reject", {
            stage: "user_not_found",
            mode: emailLike ? "email" : "name",
          });
          if (process.env.IQM_AUTH_DEBUG === "1") {
            console.warn("[iqm-auth] credentials: no user for identifier", identifier);
          }
          return null;
        }
        if (!emailLike && users.length > 1) {
          if (process.env.IQM_AUTH_DEBUG === "1") {
            console.warn("[iqm-auth] credentials: ambiguous name, ask for email", identifier);
          }
          throw new LoginAmbiguousName();
        }
        if (process.env.IQM_AUTH_DEBUG === "1") {
          console.info("[iqm-auth] user found", {
            identifier,
            email: user.email,
            role: user.role,
            status: user.status ?? null,
            hasPasswordHash: Boolean(user.passwordHash),
          });
        }
        if (user.status === "PENDING_VERIFICATION" || !user.emailVerified) {
          if (process.env.IQM_AUTH_DEBUG === "1") {
            console.warn("[iqm-auth] credentials: email not verified or pending", identifier);
          }
          throw new LoginEmailNotVerified();
        }
        if (user.status && user.status !== "ACTIVE") {
          if (process.env.IQM_AUTH_DEBUG === "1") {
            console.warn("[iqm-auth] credentials: user not ACTIVE", identifier, user.status);
          }
          throw new LoginAccountInactive();
        }
        const storedPassword = user.passwordHash ?? "";
        const isBcrypt = storedPassword.startsWith(BCRYPT_PREFIX);
        if (!isBcrypt) {
          // Security hardening: legacy plaintext hashes must be migrated, not accepted.
          if (process.env.IQM_AUTH_DEBUG === "1") {
            console.warn("[iqm-auth] rejecting non-bcrypt credential row", { identifier, userId: user.id });
          }
          throw new LoginUnsupportedPasswordHash();
        }
        const ok = await bcrypt.compare(password, storedPassword);
        if (process.env.IQM_AUTH_DEBUG === "1") {
          console.info("[iqm-auth] password mode", { identifier, mode: "bcrypt" });
        }
        if (!ok) {
          if (process.env.IQM_AUTH_DEBUG === "1") {
            console.warn("[iqm-auth] credentials: password mismatch for", identifier);
          }
          await registerFailedAttempt(fp);
          logStructured("warn", "auth.login_failed_credentials", { fpPrefix: fp.slice(0, 8) });
          logSecurityEvent("auth.failed", { fpPrefix: fp.slice(0, 8) });
          return null;
        }
        if (!user.role) {
          logStructured("warn", "auth.credentials_reject", { stage: "role_missing", userId: user.id });
          if (process.env.IQM_AUTH_DEBUG === "1") {
            console.warn("[iqm-auth] credentials: user role missing", identifier);
          }
          return null;
        }
        if (process.env.IQM_AUTH_DEBUG === "1") {
          console.info("[iqm-auth] credentials accepted", { identifier, email: user.email, role: user.role, status: user.status });
        }
        await clearLoginAttempts(fp);
        logSecurityEvent("auth.success", { role: String(user.role) });
        /** Audit shu yerda: `authorize` dagi `user` — haqiqiy Prisma qatori; `events.signIn` dagi `user` ba’zan id/email bilan mos kelmaydi. */
        try {
          await writeAuditLog({
            actorUserId: user.id,
            action: "auth.sign_in",
            entityType: "User",
            entityId: user.id,
            metadata: { provider: "credentials" },
          });
        } catch (e) {
          logStructured("warn", "audit.sign_in_write_failed", {
            message: e instanceof Error ? e.message : String(e),
          });
        }
        const role = user.role as AppRole;
        const permissionKeys = await resolvePermissionKeysForRole(user.role);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl ?? undefined,
          role,
          status: user.status,
          locale: user.locale,
          mustChangePassword: user.mustChangePassword,
          permissionKeys,
          studentNumber: user.studentNumber ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt(params) {
      const inner = authConfig.callbacks.jwt;
      const token = inner ? await inner(params) : params.token;
      if (token.role === "STUDENT" && token.id) {
        const now = Date.now();
        const last = Number(token.studentNumberSyncedAt ?? 0);
        if (now - last > STUDENT_NUMBER_JWT_SYNC_MS) {
          const cached = studentNumberCache.get(token.id as string);
          if (cached && now - cached.at <= STUDENT_NUMBER_JWT_SYNC_MS) {
            token.studentNumber = cached.value;
          } else {
            const row = await prisma.user.findUnique({
              where: { id: token.id as string },
              select: { studentNumber: true },
            });
            token.studentNumber = row?.studentNumber ?? undefined;
            studentNumberCache.set(token.id as string, { value: row?.studentNumber ?? undefined, at: now });
          }
          token.studentNumberSyncedAt = now;
        }
      }
      return token;
    },
  },
});
