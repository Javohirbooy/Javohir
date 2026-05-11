"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { writeAuditLog } from "@/lib/audit";
import { throttleServerAction } from "@/lib/action-rate-limit";
import { captureServerActionFailure } from "@/lib/sentry/server-action-capture";
import { logStructuredFromRequest } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/action-result";
import { errResult, okResult } from "@/lib/action-result";

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  avatarUrl: z
    .string()
    .trim()
    .max(500)
    .url("Avatar URL noto'g'ri.")
    .refine((value) => value.startsWith("https://"), "Avatar URL https:// bilan boshlanishi kerak.")
    .optional()
    .or(z.literal("")),
});

export type UpdateProfileResult = ActionResult<{ fullName: string; avatarUrl: string | null }>;

function isProfileRole(role: string | undefined): boolean {
  return role === "TEACHER" || role === "ADMIN";
}

export async function updateOwnProfile(input: unknown): Promise<UpdateProfileResult> {
  const rate = await throttleServerAction("profile-update", 20, 10 * 60 * 1000, { requireDistributed: true });
  if (!rate.ok) return errResult(rate.message, "RATE_LIMITED");

  const session = await auth();
  if (!session?.user?.id) return errResult("Kirish talab qilinadi.", "UNAUTHENTICATED");
  if (!isProfileRole(session.user.role)) {
    await logStructuredFromRequest("warn", "profile.update_forbidden_role", { role: session.user.role });
    return errResult("Ruxsat yo'q.", "FORBIDDEN");
  }

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return errResult(parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri.", "VALIDATION_ERROR");
  }

  const fullName = parsed.data.fullName.replace(/\s+/g, " ");
  const avatarUrl = parsed.data.avatarUrl?.trim() ? parsed.data.avatarUrl.trim() : null;

  try {
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: { name: fullName, avatarUrl },
      select: { id: true, name: true, avatarUrl: true },
    });
    await writeAuditLog({
      actorUserId: updated.id,
      action: "profile.update_self",
      entityType: "User",
      entityId: updated.id,
      metadata: { avatarUpdated: Boolean(updated.avatarUrl) },
    });
    revalidatePath("/profile");
    return okResult({ fullName: updated.name, avatarUrl: updated.avatarUrl ?? null }, "OK");
  } catch (error) {
    captureServerActionFailure("profile.updateProfile", error);
    await logStructuredFromRequest("error", "profile.update_failed");
    console.error(error);
    return errResult("Profilni saqlab bo'lmadi. Qayta urinib ko'ring.", "INTERNAL_ERROR");
  }
}
