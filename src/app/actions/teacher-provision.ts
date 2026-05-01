"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sessionHasPermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

function normalizeEmail(e: string) {
  return e.trim().toLowerCase();
}

/**
 * Admin / Super Admin: create teacher + relational grade + subject assignments.
 * `gradeIds` and `subjectIds` must come from multi-select form (same name repeated).
 */
export async function adminCreateTeacherWithAssignments(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") return;
  if (!sessionHasPermission(session, "USERS_CREATE")) return;

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !name || !password) return;

  const gradeIds = [...new Set(formData.getAll("gradeIds").map(String).filter(Boolean))];
  const subjectIds = [...new Set(formData.getAll("subjectIds").map(String).filter(Boolean))];
  if (!gradeIds.length || !subjectIds.length) return;

  const subjects = await prisma.subject.findMany({
    where: { id: { in: subjectIds } },
    select: { id: true, gradeId: true },
  });
  const gradeSet = new Set(gradeIds);
  for (const s of subjects) {
    if (!gradeSet.has(s.gradeId)) return;
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return;

  const passwordHash = await bcrypt.hash(password, 12);
  const teacher = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: "TEACHER",
      status: "ACTIVE",
      mustChangePassword: true,
      credentialIssuedById: session.user.id,
    },
  });

  await prisma.teacherOnClass.createMany({
    data: gradeIds.map((gradeId) => ({ userId: teacher.id, gradeId })),
  });
  await prisma.teacherSubjectAssignment.createMany({
    data: subjectIds.map((subjectId) => ({ userId: teacher.id, subjectId })),
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "TEACHER_PROVISION",
    entityType: "User",
    entityId: teacher.id,
    metadata: { gradeIds, subjectIds },
  });

  revalidatePath("/admin/foydalanuvchilar");
  revalidatePath("/admin/ustozlar/yangi");
}

export type TeacherProvisionState = { ok: boolean; error?: string } | null;

const USER_STATUSES = ["ACTIVE", "INACTIVE", "BLOCKED"] as const;

function parseUserStatus(raw: string): string {
  const u = raw.trim().toUpperCase();
  return (USER_STATUSES as readonly string[]).includes(u) ? u : "ACTIVE";
}

/** useFormState — create teacher with assignments + clear error messages. */
export async function adminCreateTeacherFormAction(_prev: TeacherProvisionState, formData: FormData): Promise<TeacherProvisionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Kirish talab qilinadi." };
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") return { ok: false, error: "Ruxsat yo‘q." };
  if (!sessionHasPermission(session, "USERS_CREATE")) return { ok: false, error: "Ruxsat yo‘q." };

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !name || !password) return { ok: false, error: "Email, ism va parol majburiy." };
  if (password.length < 6) return { ok: false, error: "Parol kamida 6 belgi bo‘lsin." };

  const gradeIds = [...new Set(formData.getAll("gradeIds").map(String).filter(Boolean))];
  const subjectIds = [...new Set(formData.getAll("subjectIds").map(String).filter(Boolean))];
  if (!gradeIds.length || !subjectIds.length) {
    return { ok: false, error: "Kamida bitta sinf va bitta fan tanlang." };
  }

  const subjects = await prisma.subject.findMany({
    where: { id: { in: subjectIds } },
    select: { id: true, gradeId: true },
  });
  const gradeSet = new Set(gradeIds);
  for (const s of subjects) {
    if (!gradeSet.has(s.gradeId)) {
      return { ok: false, error: "Har bir tanlangan fan tanlangan sinflardan biriga tegishli bo‘lishi kerak." };
    }
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { ok: false, error: "Bu email allaqachon ishlatilgan." };

  const passwordHash = await bcrypt.hash(password, 12);
  const teacher = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: "TEACHER",
      status: "ACTIVE",
      mustChangePassword: true,
      credentialIssuedById: session.user.id,
    },
  });

  await prisma.teacherOnClass.createMany({
    data: gradeIds.map((gradeId) => ({ userId: teacher.id, gradeId })),
  });
  await prisma.teacherSubjectAssignment.createMany({
    data: subjectIds.map((subjectId) => ({ userId: teacher.id, subjectId })),
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "TEACHER_PROVISION",
    entityType: "User",
    entityId: teacher.id,
    metadata: { gradeIds, subjectIds },
  });

  revalidatePath("/admin/foydalanuvchilar");
  revalidatePath("/admin/ustozlar");
  revalidatePath("/admin/ustozlar/yangi");
  return { ok: true };
}

/** useFormState — update teacher profile + class/subject matrix. */
export async function adminUpdateTeacherFormAction(_prev: TeacherProvisionState, formData: FormData): Promise<TeacherProvisionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Kirish talab qilinadi." };
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") return { ok: false, error: "Ruxsat yo‘q." };
  if (!sessionHasPermission(session, "USERS_UPDATE")) return { ok: false, error: "Ruxsat yo‘q." };

  const teacherId = String(formData.get("teacherId") ?? "").trim();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const name = String(formData.get("name") ?? "").trim();
  const status = parseUserStatus(String(formData.get("status") ?? "ACTIVE"));
  const newPassword = String(formData.get("newPassword") ?? "").trim();
  const gradeIds = [...new Set(formData.getAll("gradeIds").map(String).filter(Boolean))];
  const subjectIds = [...new Set(formData.getAll("subjectIds").map(String).filter(Boolean))];

  if (!teacherId || !email || !name) return { ok: false, error: "Majburiy maydonlarni to‘ldiring." };
  if (!gradeIds.length || !subjectIds.length) {
    return { ok: false, error: "Kamida bitta sinf va bitta fan tanlang." };
  }

  const teacher = await prisma.user.findFirst({ where: { id: teacherId, role: "TEACHER" } });
  if (!teacher) return { ok: false, error: "O‘qituvchi topilmadi." };

  const emailOwner = await prisma.user.findUnique({ where: { email } });
  if (emailOwner && emailOwner.id !== teacherId) return { ok: false, error: "Bu email boshqa foydalanuvchiga tegishli." };

  const subjects = await prisma.subject.findMany({
    where: { id: { in: subjectIds } },
    select: { id: true, gradeId: true },
  });
  const gradeSet = new Set(gradeIds);
  for (const s of subjects) {
    if (!gradeSet.has(s.gradeId)) {
      return { ok: false, error: "Har bir fan tanlangan sinflardan biriga tegishli bo‘lishi kerak." };
    }
  }

  const passwordUpdate =
    newPassword.length >= 6
      ? { passwordHash: await bcrypt.hash(newPassword, 12), mustChangePassword: true, credentialIssuedById: session.user.id }
      : {};

  await prisma.$transaction(async (tx) => {
    await tx.teacherOnClass.deleteMany({ where: { userId: teacherId } });
    await tx.teacherSubjectAssignment.deleteMany({ where: { userId: teacherId } });
    await tx.user.update({
      where: { id: teacherId },
      data: { email, name, status, ...passwordUpdate },
    });
    await tx.teacherOnClass.createMany({
      data: gradeIds.map((gradeId) => ({ userId: teacherId, gradeId })),
    });
    await tx.teacherSubjectAssignment.createMany({
      data: subjectIds.map((subjectId) => ({ userId: teacherId, subjectId })),
    });
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "TEACHER_ASSIGNMENT_UPDATE",
    entityType: "User",
    entityId: teacherId,
    metadata: { gradeIds, subjectIds, emailChanged: email !== teacher.email },
  });

  revalidatePath("/admin/ustozlar");
  revalidatePath(`/admin/ustozlar/${teacherId}/tahrirlash`);
  revalidatePath("/admin/foydalanuvchilar");
  return { ok: true };
}

