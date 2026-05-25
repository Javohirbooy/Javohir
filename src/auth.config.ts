import type { NextAuthConfig } from "next-auth";
import type { AppRole } from "@/lib/app-role";
import { applySessionIdleToJwtToken, isSessionIdleExpired } from "@/lib/auth-session-idle";
import { staticPermissionKeysForRole } from "@/lib/static-role-permissions";

/**
 * Edge-compatible (middleware): Prisma / bcrypt import qilinmasin.
 * To‘liq provayderlar va audit — `auth.ts` da.
 */
export const authConfig = {
  /** Edge middleware JWT: `AUTH_SECRET` (Auth.js v5); ba’zi loyihalar hali `NEXTAUTH_SECRET` ishlatadi. */
  secret: process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim(),
  trustHost: true,
  pages: { signIn: "/kirish" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  providers: [],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as AppRole;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
        token.status = (user as { status?: string }).status;
        token.locale = (user as { locale?: string }).locale;
        token.mustChangePassword = (user as { mustChangePassword?: boolean }).mustChangePassword;
        token.studentNumber = (user as { studentNumber?: number | null }).studentNumber ?? undefined;
        {
          const incoming = (user as { permissionKeys?: string[] }).permissionKeys;
          token.permissionKeys =
            Array.isArray(incoming) && incoming.length > 0
              ? incoming
              : staticPermissionKeysForRole(String(user.role));
        }
      }
      if (trigger === "update" && token.role) {
        const staticKeys = staticPermissionKeysForRole(String(token.role));
        const prev = Array.isArray(token.permissionKeys) ? token.permissionKeys : [];
        token.permissionKeys = [...new Set([...staticKeys, ...prev])];
      }
      /** Eski JWT / token.permissionKeys yo‘q — middleware va RSC sessiyasida ruxsatlar bo‘sh qolmasin. */
      if (token.role && (!Array.isArray(token.permissionKeys) || token.permissionKeys.length === 0)) {
        token.permissionKeys = staticPermissionKeysForRole(String(token.role));
      }

      return applySessionIdleToJwtToken(token, { isNewSignIn: Boolean(user) });
    },
    session({ session, token }) {
      if (isSessionIdleExpired(token)) {
        return { ...session, expires: new Date(0).toISOString() };
      }
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = typeof token.name === "string" ? token.name : session.user.name;
        session.user.email = typeof token.email === "string" ? token.email : session.user.email;
        session.user.image = typeof token.picture === "string" ? token.picture : session.user.image;
        session.user.role = token.role as AppRole;
        session.user.status = token.status as string | undefined;
        session.user.locale = token.locale as string | undefined;
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
        session.user.studentNumber =
          typeof token.studentNumber === "number" ? token.studentNumber : undefined;
        {
          const fromToken = Array.isArray(token.permissionKeys) ? (token.permissionKeys as string[]) : [];
          session.user.permissionKeys =
            fromToken.length > 0
              ? fromToken
              : staticPermissionKeysForRole(String(token.role ?? ""));
        }
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
