import type { NextAuthConfig } from "next-auth";
import type { AppRole } from "@/lib/app-role";
import { staticPermissionKeysForRole } from "@/lib/static-role-permissions";

/**
 * Edge-compatible (middleware): Prisma / bcrypt import qilinmasin.
 * To‘liq provayderlar va audit — `auth.ts` da.
 */
export const authConfig = {
  /** Edge middleware JWT tekshiruvi uchun majburiy (Vercel). AUTH_SECRET env bilan bir xil. */
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  pages: { signIn: "/kirish" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  providers: [],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as AppRole;
        token.status = (user as { status?: string }).status;
        token.locale = (user as { locale?: string }).locale;
        token.mustChangePassword = (user as { mustChangePassword?: boolean }).mustChangePassword;
        token.permissionKeys =
          (user as { permissionKeys?: string[] }).permissionKeys ?? staticPermissionKeysForRole(String(user.role));
      }
      if (trigger === "update" && token.role) {
        token.permissionKeys = staticPermissionKeysForRole(token.role as string);
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as AppRole;
        session.user.status = token.status as string | undefined;
        session.user.locale = token.locale as string | undefined;
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
        session.user.permissionKeys = Array.isArray(token.permissionKeys)
          ? (token.permissionKeys as string[])
          : [];
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
