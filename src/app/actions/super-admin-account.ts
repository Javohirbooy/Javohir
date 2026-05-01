"use server";

import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sessionHasPermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

export type SuperAdminAccountState =
  | null
  | {
      ok?: boolean;
      error?: string;
      success?: string;
    };

export async function updateOwnCredentials(
  _prev: SuperAdminAccountState,
  formData: FormData,
): Promise<SuperAdminAccountState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Kirish talab qilinadi." };
  if (!sessionHasPermission(session, "SITE_SETTINGS_SUPER")) return { error: "Ruxsat yo‘q." };

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  if (!email.includes("@")) return { error: "Email noto‘g‘ri." };
  if (!currentPassword) return { error: "Joriy parolni kiriting." };
  if (newPassword.length < 6) return { error: "Yangi parol kamida 6 ta belgidan iborat bo‘lsin." };

  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me) return { error: "Foydalanuvchi topilmadi." };

  const stored = me.passwordHash ?? "";
  const ok = stored.startsWith("$2") ? await bcrypt.compare(currentPassword, stored) : currentPassword === stored;
  if (!ok) return { error: "Joriy parol noto‘g‘ri." };

  const clash = await prisma.user.findFirst({
    where: { email, NOT: { id: me.id } },
    select: { id: true },
  });
  if (clash) return { error: "Bu email allaqachon band." };

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

  return { ok: true, success: "Login va parol yangilandi." };
}

