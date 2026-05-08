"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logStructuredFromRequest } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { sessionHasPermission } from "@/lib/permissions";
import type { ActionResult } from "@/lib/action-result";
import { errResult, okResult } from "@/lib/action-result";

async function assertSubjectsManage() {
  const s = await auth();
  if (!s?.user?.id) return false;
  if (!sessionHasPermission(s, "SUBJECTS_MANAGE")) return false;
  return true;
}

export async function adminCreateSubjectResult(formData: FormData): Promise<ActionResult> {
  if (!(await assertSubjectsManage())) {
    await logStructuredFromRequest("warn", "admin.subject_create_forbidden");
    return errResult("Ruxsat yo'q.", "FORBIDDEN");
  }

  const gradeId = String(formData.get("gradeId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const imageEmoji = String(formData.get("imageEmoji") ?? "📘").trim() || "📘";
  const order = Number(formData.get("order") ?? 0) || 0;

  if (!gradeId || !title) return errResult("Majburiy maydonlar to'ldirilmagan.", "VALIDATION_ERROR");

  await prisma.subject.create({
    data: { gradeId, title, description: description || "—", imageEmoji, order },
  });

  revalidatePath("/admin/fanlar");
  return okResult(undefined, "OK");
}

export async function adminUpdateSubjectResult(formData: FormData): Promise<ActionResult> {
  if (!(await assertSubjectsManage())) {
    await logStructuredFromRequest("warn", "admin.subject_update_forbidden");
    return errResult("Ruxsat yo'q.", "FORBIDDEN");
  }

  const id = String(formData.get("id") ?? "").trim();
  const gradeId = String(formData.get("gradeId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const imageEmoji = String(formData.get("imageEmoji") ?? "📘").trim() || "📘";
  const order = Number(formData.get("order") ?? 0) || 0;

  if (!id || !gradeId || !title) return errResult("Majburiy maydonlar to'ldirilmagan.", "VALIDATION_ERROR");

  await prisma.subject.update({
    where: { id },
    data: { gradeId, title, description: description || "—", imageEmoji, order },
  });

  revalidatePath("/admin/fanlar");
  return okResult(undefined, "OK");
}

export async function adminDeleteSubjectResult(formData: FormData): Promise<ActionResult> {
  if (!(await assertSubjectsManage())) {
    await logStructuredFromRequest("warn", "admin.subject_delete_forbidden");
    return errResult("Ruxsat yo'q.", "FORBIDDEN");
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return errResult("Fan identifikatori topilmadi.", "VALIDATION_ERROR");

  await prisma.subject.delete({ where: { id } });
  revalidatePath("/admin/fanlar");
  return okResult(undefined, "OK");
}

/** Form-compatible wrappers (return type stays void/Promise<void>). */
export async function adminCreateSubject(formData: FormData): Promise<void> {
  const r = await adminCreateSubjectResult(formData);
  if (!r.ok) throw new Error(r.error);
}

export async function adminUpdateSubject(formData: FormData): Promise<void> {
  const r = await adminUpdateSubjectResult(formData);
  if (!r.ok) throw new Error(r.error);
}

export async function adminDeleteSubject(formData: FormData): Promise<void> {
  const r = await adminDeleteSubjectResult(formData);
  if (!r.ok) throw new Error(r.error);
}
