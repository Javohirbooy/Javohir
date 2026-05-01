"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sessionHasPermission } from "@/lib/permissions";

async function assertSubjectsManage() {
  const s = await auth();
  if (!s?.user?.id) return false;
  if (!sessionHasPermission(s, "SUBJECTS_MANAGE")) return false;
  return true;
}

export async function adminCreateSubject(formData: FormData): Promise<void> {
  if (!(await assertSubjectsManage())) return;

  const gradeId = String(formData.get("gradeId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const imageEmoji = String(formData.get("imageEmoji") ?? "📘").trim() || "📘";
  const order = Number(formData.get("order") ?? 0) || 0;

  if (!gradeId || !title) return;

  await prisma.subject.create({
    data: { gradeId, title, description: description || "—", imageEmoji, order },
  });

  revalidatePath("/admin/fanlar");
}

export async function adminUpdateSubject(formData: FormData): Promise<void> {
  if (!(await assertSubjectsManage())) return;

  const id = String(formData.get("id") ?? "").trim();
  const gradeId = String(formData.get("gradeId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const imageEmoji = String(formData.get("imageEmoji") ?? "📘").trim() || "📘";
  const order = Number(formData.get("order") ?? 0) || 0;

  if (!id || !gradeId || !title) return;

  await prisma.subject.update({
    where: { id },
    data: { gradeId, title, description: description || "—", imageEmoji, order },
  });

  revalidatePath("/admin/fanlar");
}

export async function adminDeleteSubject(formData: FormData): Promise<void> {
  if (!(await assertSubjectsManage())) return;

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  await prisma.subject.delete({ where: { id } });
  revalidatePath("/admin/fanlar");
}
