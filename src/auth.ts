import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import type { AppRole } from "@/lib/app-role";
import { resolvePermissionKeysForRole } from "@/lib/permissions";
import { authConfig } from "@/auth.config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Parol", type: "password" },
      },
      authorize: async (raw) => {
        if (process.env.IQM_AUTH_DEBUG === "1") {
          const emailPreview = typeof raw?.email === "string" ? raw.email : undefined;
          const hasPassword = typeof raw?.password === "string" && raw.password.length > 0;
          console.info("[iqm-auth] credentials received", { emailPreview, hasPassword });
        }
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) {
          if (process.env.IQM_AUTH_DEBUG === "1") {
            console.warn("[iqm-auth] credentials parse failed", parsed.error.flatten().fieldErrors);
          }
          return null;
        }
        const email = parsed.data.email.trim().toLowerCase();
        const password = parsed.data.password;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          if (process.env.IQM_AUTH_DEBUG === "1") {
            console.warn("[iqm-auth] credentials: no user for email", email);
          }
          return null;
        }
        if (process.env.IQM_AUTH_DEBUG === "1") {
          console.info("[iqm-auth] user found", {
            email,
            role: user.role,
            status: user.status ?? null,
            hasPasswordHash: Boolean(user.passwordHash),
          });
        }
        if (user.status && user.status !== "ACTIVE") {
          if (process.env.IQM_AUTH_DEBUG === "1") {
            console.warn("[iqm-auth] credentials: user not ACTIVE", email, user.status);
          }
          return null;
        }
        const storedPassword = user.passwordHash ?? "";
        const mode = storedPassword.startsWith("$2") ? "bcrypt" : "plain";
        const ok =
          mode === "bcrypt" ? await bcrypt.compare(password, storedPassword) : password === storedPassword;
        if (process.env.IQM_AUTH_DEBUG === "1") {
          console.info("[iqm-auth] password mode", { email, mode });
        }
        if (!ok) {
          if (process.env.IQM_AUTH_DEBUG === "1") {
            console.warn("[iqm-auth] credentials: password mismatch for", email);
          }
          if (
            process.env.NODE_ENV !== "production" &&
            password === "password" &&
            ["super@demo.uz", "admin@demo.uz", "teacher@demo.uz", "student@demo.uz"].includes(email)
          ) {
            if (process.env.IQM_AUTH_DEBUG === "1") {
              console.warn("[iqm-auth] DEV fallback accepted", email);
            }
          } else {
            return null;
          }
        }
        if (!user.role) {
          if (process.env.IQM_AUTH_DEBUG === "1") {
            console.warn("[iqm-auth] credentials: user role missing", email);
          }
          return null;
        }
        if (process.env.IQM_AUTH_DEBUG === "1") {
          console.info("[iqm-auth] credentials accepted", { email, role: user.role, status: user.status });
        }
        const role = user.role as AppRole;
        const permissionKeys = await resolvePermissionKeysForRole(user.role);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
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
  events: {
    async signIn({ user }) {
      const id = user?.id;
      if (!id) return;
      await writeAuditLog({
        actorUserId: id,
        action: "auth.sign_in",
        entityType: "User",
        entityId: id,
        metadata: { provider: "credentials" },
      });
    },
  },
});
