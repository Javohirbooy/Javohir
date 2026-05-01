"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sessionHasPermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { teacherManagesStudent } from "@/lib/teacher-scope";

export type StudentFormState = { ok: boolean; error?: string } | null;

function normalizeEmail(e: string) {
  return e.trim().toLowerCase();
}

const STUDENT_STATUSES = ["ACTIVE", "INACTIVE", "BLOCKED"] as const;

function parseStatus(raw: string): string {
  const u = raw.trim().toUpperCase();
  return (STUDENT_STATUSES as readonly string[]).includes(u) ? u : "ACTIVE";
}

async function assertUniqueEmail(email: string, excludeUserId?: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== excludeUserId) {
    return { ok: false as const, error: "Bu email allaqachon ro‘yxatdan o‘tgan." };
  }
  return { ok: true as const };
}

async function assertTeacherExists(teacherId: string) {
  const t = await prisma.user.findFirst({ where: { id: teacherId, role: "TEACHER" } });
  if (!t) return { ok: false as const, error: "O‘qituvchi topilmadi." };
  return { ok: true as const };
}

/** useFormState — admin creates student (+ optional managing teacher). */
export async function adminCreateStudentFormAction(_prev: StudentFormState, formData: FormData): Promise<StudentFormState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Kirish talab qilinadi." };
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") return { ok: false, error: "Ruxsat yo‘q." };
  if (!sessionHasPermission(session, "USERS_CREATE")) return { ok: false, error: "Ruxsat yo‘q." };

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const gradeId = String(formData.get("gradeId") ?? "").trim();
  const status = parseStatus(String(formData.get("status") ?? "ACTIVE"));
  const managingTeacherId = String(formData.get("managingTeacherId") ?? "").trim() || null;

  if (!email || !name || !password || !gradeId) return { ok: false, error: "Majburiy maydonlarni to‘ldiring." };
  if (password.length < 6) return { ok: false, error: "Parol kamida 6 belgi bo‘lsin." };

  const uniq = await assertUniqueEmail(email);
  if (!uniq.ok) return uniq;

  if (managingTeacherId) {
    const t = await assertTeacherExists(managingTeacherId);
    if (!t.ok) return t;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const student = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: "STUDENT",
      status,
      gradeId,
      mustChangePassword: true,
      credentialIssuedById: session.user.id,
    },
  });

  if (managingTeacherId) {
    await prisma.teacherStudentLink.upsert({
      where: { studentUserId: student.id },
      create: { teacherUserId: managingTeacherId, studentUserId: student.id },
      update: { teacherUserId: managingTeacherId },
    });
  }

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "STUDENT_CREATED",
    entityType: "User",
    entityId: student.id,
    metadata: { email, gradeId, managingTeacherId },
  });

  revalidatePath("/admin/oquvchilar");
  revalidatePath("/admin/foydalanuvchilar");
  return { ok: true };
}

/** useFormState — teacher creates student in assigned class + link. */
export async function teacherCreateStudentFormAction(_prev: StudentFormState, formData: FormData): Promise<StudentFormState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Kirish talab qilinadi." };
  if (session.user.role !== "TEACHER") return { ok: false, error: "Faqat o‘qituvchilar." };
  if (!sessionHasPermission(session, "USERS_CREATE")) return { ok: false, error: "Ruxsat yo‘q." };

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const gradeId = String(formData.get("gradeId") ?? "").trim();
  const status = parseStatus(String(formData.get("status") ?? "ACTIVE"));
  if (status === "BLOCKED" && !sessionHasPermission(session, "USERS_BLOCK")) {
    return { ok: false, error: "Bloklash huquqi yo‘q." };
  }

  if (!email || !name || !password || !gradeId) return { ok: false, error: "Majburiy maydonlarni to‘ldiring." };
  if (password.length < 6) return { ok: false, error: "Parol kamida 6 belgi bo‘lsin." };

  const onClass = await prisma.teacherOnClass.findFirst({ where: { userId: session.user.id, gradeId } });
  if (!onClass) return { ok: false, error: "Bu sinf sizga biriktirilmagan." };

  const uniq = await assertUniqueEmail(email);
  if (!uniq.ok) return uniq;

  const passwordHash = await bcrypt.hash(password, 12);
  const student = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: "STUDENT",
      status,
      gradeId,
      mustChangePassword: true,
      credentialIssuedById: session.user.id,
    },
  });

  await prisma.teacherStudentLink.upsert({
    where: { studentUserId: student.id },
    create: { teacherUserId: session.user.id, studentUserId: student.id },
    update: { teacherUserId: session.user.id },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "STUDENT_CREATED",
    entityType: "User",
    entityId: student.id,
    metadata: { email, gradeId, scope: "teacher" },
  });

  revalidatePath("/oqituvchi/oquvchilar");
  revalidatePath("/oqituvchi");
  return { ok: true };
}

/** useFormState — admin updates student + optional managing teacher. */
export async function adminUpdateStudentFormAction(_prev: StudentFormState, formData: FormData): Promise<StudentFormState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Kirish talab qilinadi." };
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") return { ok: false, error: "Ruxsat yo‘q." };
  if (!sessionHasPermission(session, "USERS_UPDATE")) return { ok: false, error: "Ruxsat yo‘q." };

  const studentId = String(formData.get("studentId") ?? "").trim();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const name = String(formData.get("name") ?? "").trim();
  const gradeId = String(formData.get("gradeId") ?? "").trim();
  const status = parseStatus(String(formData.get("status") ?? "ACTIVE"));
  const managingTeacherId = String(formData.get("managingTeacherId") ?? "").trim() || null;

  if (!studentId || !email || !name || !gradeId) return { ok: false, error: "Majburiy maydonlarni to‘ldiring." };

  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.role !== "STUDENT") return { ok: false, error: "O‘quvchi topilmadi." };

  const uniq = await assertUniqueEmail(email, studentId);
  if (!uniq.ok) return uniq;

  if (managingTeacherId) {
    const t = await assertTeacherExists(managingTeacherId);
    if (!t.ok) return t;
  }

  await prisma.user.update({
    where: { id: studentId },
    data: { email, name, gradeId, status },
  });

  if (managingTeacherId) {
    await prisma.teacherStudentLink.upsert({
      where: { studentUserId: studentId },
      create: { teacherUserId: managingTeacherId, studentUserId: studentId },
      update: { teacherUserId: managingTeacherId },
    });
  } else {
    await prisma.teacherStudentLink.deleteMany({ where: { studentUserId: studentId } });
  }

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "STUDENT_UPDATED",
    entityType: "User",
    entityId: studentId,
    metadata: { email, gradeId, managingTeacherId },
  });

  revalidatePath("/admin/oquvchilar");
  revalidatePath(`/admin/oquvchilar/${studentId}`);
  revalidatePath("/admin/foydalanuvchilar");
  return { ok: true };
}

/** useFormState — teacher updates own linked student. */
export async function teacherUpdateStudentFormAction(_prev: StudentFormState, formData: FormData): Promise<StudentFormState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Kirish talab qilinadi." };
  if (session.user.role !== "TEACHER") return { ok: false, error: "Faqat o‘qituvchilar." };
  if (!sessionHasPermission(session, "USERS_UPDATE")) return { ok: false, error: "Ruxsat yo‘q." };

  const studentId = String(formData.get("studentId") ?? "").trim();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const name = String(formData.get("name") ?? "").trim();
  const gradeId = String(formData.get("gradeId") ?? "").trim();
  const status = parseStatus(String(formData.get("status") ?? "ACTIVE"));

  if (!studentId || !email || !name || !gradeId) return { ok: false, error: "Majburiy maydonlarni to‘ldiring." };
  if (!(await teacherManagesStudent(session.user.id, studentId))) return { ok: false, error: "Bu o‘quvchi sizga biriktirilmagan." };
  if (status === "BLOCKED" && !sessionHasPermission(session, "USERS_BLOCK")) {
    return { ok: false, error: "Bloklash huquqi yo‘q." };
  }

  const onClass = await prisma.teacherOnClass.findFirst({ where: { userId: session.user.id, gradeId } });
  if (!onClass) return { ok: false, error: "Bu sinf sizga biriktirilmagan." };

  const uniq = await assertUniqueEmail(email, studentId);
  if (!uniq.ok) return uniq;

  await prisma.user.update({
    where: { id: studentId },
    data: { email, name, gradeId, status },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "STUDENT_UPDATED",
    entityType: "User",
    entityId: studentId,
    metadata: { scope: "teacher" },
  });

  revalidatePath("/oqituvchi/oquvchilar");
  revalidatePath(`/oqituvchi/oquvchilar/${studentId}`);
  return { ok: true };
}

/** useFormState — admin or assigned teacher resets password. */
export async function resetStudentPasswordFormAction(_prev: StudentFormState, formData: FormData): Promise<StudentFormState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Kirish talab qilinadi." };
  if (!sessionHasPermission(session, "PASSWORD_RESET_ANY") && !sessionHasPermission(session, "PASSWORD_RESET_ASSIGNED_STUDENTS")) {
    return { ok: false, error: "Ruxsat yo‘q." };
  }

  const studentId = String(formData.get("studentId") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!studentId || !password) return { ok: false, error: "Parol kiriting." };
  if (password.length < 6) return { ok: false, error: "Parol kamida 6 belgi bo‘lsin." };

  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.role !== "STUDENT") return { ok: false, error: "O‘quvchi topilmadi." };

  if (session.user.role === "TEACHER") {
    if (!(await teacherManagesStudent(session.user.id, studentId))) return { ok: false, error: "Bu o‘quvchi sizga biriktirilmagan." };
  } else if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return { ok: false, error: "Ruxsat yo‘q." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: studentId },
    data: { passwordHash, mustChangePassword: true, credentialIssuedById: session.user.id },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "STUDENT_PASSWORD_RESET",
    entityType: "User",
    entityId: studentId,
    metadata: {},
  });

  revalidatePath("/admin/oquvchilar");
  revalidatePath(`/admin/oquvchilar/${studentId}`);
  revalidatePath("/oqituvchi/oquvchilar");
  revalidatePath(`/oqituvchi/oquvchilar/${studentId}`);
  return { ok: true };
}
