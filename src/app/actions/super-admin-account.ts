"use server";

import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sessionHasPermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import type { ActionResult } from "@/lib/action-result";
import { errResult, okResult } from "@/lib/action-result";

export type SuperAdminAccountState = ActionResult<{ success?: string }>;

export async function updateOwnCredentials(
  _prev: SuperAdminAccountState,
  formData: FormData,
): Promise<SuperAdminAccountState> {
  const session = await auth();
  if (!session?.user?.id) return errResult("Kirish talab qilinadi.", "UNAUTHENTICATED");
  if (!sessionHasPermission(session, "SITE_SETTINGS_SUPER")) return errResult("Ruxsat yo‘q.", "FORBIDDEN");

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  if (!email.includes("@")) return errResult("Email noto‘g‘ri.", "VALIDATION_ERROR");
  if (!currentPassword) return errResult("Joriy parolni kiriting.", "VALIDATION_ERROR");
  if (newPassword.length < 6) return errResult("Yangi parol kamida 6 ta belgidan iborat bo‘lsin.", "VALIDATION_ERROR");

  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me) return errResult("Foydalanuvchi topilmadi.", "NOT_FOUND");

  const stored = me.passwordHash ?? "";
  const ok = stored.startsWith("$2") ? await bcrypt.compare(currentPassword, stored) : currentPassword === stored;
  if (!ok) return errResult("Joriy parol noto‘g‘ri.", "FORBIDDEN");

  const clash = await prisma.user.findFirst({
    where: { email, NOT: { id: me.id } },
    select: { id: true },
  });
  if (clash) return errResult("Bu email allaqachon band.", "CONFLICT");

  const newHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: me.id },
    data: {
      email,
      passwordHash: newHash,
      mustChangePassword: false,
    },
  });

  await writeAuditLog({
    actorUserId: me.id,
    action: "SUPER_ADMIN_CREDENTIALS_UPDATE_SELF",
    entityType: "User",
    entityId: me.id,
    metadata: { emailChanged: email !== me.email },
  });

  return okResult({ success: "Login va parol yangilandi." }, "OK");
}

