"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sessionHasPermission } from "@/lib/permissions";
import { canDeleteTest } from "@/lib/test-policy";
import { teacherCanComposeTest } from "@/lib/teacher-scope";
import { writeAuditLog } from "@/lib/audit";

export type TeacherQuestionInput = {
  text: string;
  options: string[];
  correctIndex: number;
};

export type CreateTeacherTestInput = {
  title: string;
  description?: string | null;
  subjectId: string;
  /** Required for TEACHER; ignored for ADMIN (derived from subject). */
  gradeId?: string | null;
  topicId?: string | null;
  topicTitle?: string;
  difficulty: string;
  durationMinutes: number;
  passScore: number;
  maxAttempts: number;
  questionCountTarget: number;
  isActive: boolean;
  isDraft: boolean;
  /** Preferred over isDraft/isActive when set from teacher UI buttons. */
  publishIntent?: "draft" | "publish";
  questions: TeacherQuestionInput[];
  /** ISO strings or empty */
  startsAt?: string | null;
  endsAt?: string | null;
  protectedExamMode?: boolean;
  tabSwitchPolicy?: string;
  antiCheatMode?: string;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
};

function deriveLifecycle(input: CreateTeacherTestInput): { status: string; isDraft: boolean; isActive: boolean } {
  if (input.publishIntent === "publish") return { status: "PUBLISHED", isDraft: false, isActive: true };
  if (input.publishIntent === "draft") return { status: "DRAFT", isDraft: true, isActive: false };
  if (input.isDraft) return { status: "DRAFT", isDraft: true, isActive: false };
  if (input.isActive) return { status: "PUBLISHED", isDraft: false, isActive: true };
  return { status: "ARCHIVED", isDraft: false, isActive: false };
}

function normalizeAntiCheat(raw: string | undefined): string {
  const u = (raw ?? "STANDARD").toUpperCase();
  if (u === "OFF" || u === "STANDARD" || u === "STRICT") return u;
  return "STANDARD";
}

/**
 * Creates a test. Session role decides ownership:
 * - TEACHER → `authorUserId` = self (must have relational class + subject assignment).
 * - ADMIN / SUPER_ADMIN → `authorUserId` = null (platform test).
 */
export async function createTest(input: CreateTeacherTestInput) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: "Kirish talab qilinadi." };
  if (!sessionHasPermission(session, "TESTS_CREATE")) {
    return { ok: false as const, error: "Test yaratish huquqi yo‘q." };
  }

  const title = input.title.trim();
  if (!title) return { ok: false as const, error: "Test nomi majburiy." };
  if (!input.subjectId) return { ok: false as const, error: "Fan tanlanishi kerak." };

  const subjectRow = await prisma.subject.findUnique({
    where: { id: input.subjectId },
    select: { id: true, gradeId: true },
  });
  if (!subjectRow) return { ok: false as const, error: "Fan topilmadi." };

  const role = session.user.role;
  let authorUserId: string | null = null;
  let gradeId: string | null = null;

  if (role === "TEACHER") {
    const gid = String(input.gradeId ?? "").trim();
    if (!gid) return { ok: false as const, error: "Sinf tanlanishi kerak." };
    const scope = await teacherCanComposeTest(session.user.id, {
      gradeId: gid,
      subjectId: input.subjectId,
      topicId: input.topicId ?? undefined,
    });
    if (!scope.ok) return { ok: false as const, error: scope.error };
    authorUserId = session.user.id;
    gradeId = gid;
  } else if (role === "ADMIN" || role === "SUPER_ADMIN") {
    authorUserId = null;
    gradeId = subjectRow.gradeId;
  } else {
    return { ok: false as const, error: "Bu amal uchun rol mos emas." };
  }

  const qs = input.questions.filter((q) => q.text.trim() && q.options.filter(Boolean).length >= 2);
  if (!qs.length) return { ok: false as const, error: "Kamida bitta to‘liq savol kiriting." };

  let topicId: string | null = input.topicId?.trim() || null;
  const topicTitle = input.topicTitle?.trim();
  if (!topicId && topicTitle) {
    const created = await prisma.topic.create({
      data: { subjectId: input.subjectId, title: topicTitle, order: 0 },
    });
    topicId = created.id;
  }

  const startsAt = input.startsAt ? new Date(input.startsAt) : null;
  const endsAt = input.endsAt ? new Date(input.endsAt) : null;
  const maxAttempts = input.maxAttempts > 0 ? input.maxAttempts : null;
  const antiCheatMode = normalizeAntiCheat(input.antiCheatMode);
  let protectedExamMode = Boolean(input.protectedExamMode);
  let tabSwitchPolicy = (input.tabSwitchPolicy?.trim() || "AUTO_SUBMIT").toUpperCase();
  if (antiCheatMode === "STRICT") {
    protectedExamMode = true;
    tabSwitchPolicy = "AUTO_SUBMIT";
  }
  tabSwitchPolicy = ["WARNING", "AUTO_FAIL", "AUTO_SUBMIT"].includes(tabSwitchPolicy) ? tabSwitchPolicy : "AUTO_SUBMIT";
  const shuffleQuestions = input.shuffleQuestions !== false;
  const shuffleOptions = input.shuffleOptions !== false;
  const { status, isDraft, isActive } = deriveLifecycle(input);

  const test = await prisma.test.create({
    data: {
      subjectId: input.subjectId,
      gradeId,
      topicId,
      title,
      description: input.description?.trim() || null,
      difficulty: input.difficulty || "MEDIUM",
      durationMinutes: input.durationMinutes || null,
      passScore: input.passScore,
      maxAttempts,
      isDraft,
      isActive,
      status,
      authorUserId,
      antiCheatMode,
      startsAt: startsAt && !Number.isNaN(startsAt.getTime()) ? startsAt : null,
      endsAt: endsAt && !Number.isNaN(endsAt.getTime()) ? endsAt : null,
      protectedExamMode,
      tabSwitchPolicy,
      shuffleQuestions,
      shuffleOptions,
      sourceType: "MANUAL",
      questions: {
        create: qs.map((q, order) => {
          const opts = q.options.map((o) => o.trim()).filter(Boolean);
          return {
            text: q.text.trim(),
            optionsJson: JSON.stringify(opts),
            correctIndex: Math.min(Math.max(0, q.correctIndex), Math.max(0, opts.length - 1)),
            order,
          };
        }),
      },
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "TEST_CREATE",
    entityType: "Test",
    entityId: test.id,
    metadata: { title, subjectId: input.subjectId, protectedExamMode },
  });

  revalidatePath("/oqituvchi/testlar");
  revalidatePath("/oqituvchi");
  revalidatePath("/admin/testlar");
  revalidatePath("/admin");

  return { ok: true as const, testId: test.id };
}

export async function updateTeacherTest(
  testId: string,
  input: CreateTeacherTestInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Kirish talab qilinadi." };
  if (!sessionHasPermission(session, "TESTS_EDIT")) return { ok: false, error: "Tahrirlash huquqi yo‘q." };

  const existing = await prisma.test.findUnique({
    where: { id: testId },
    select: { id: true, authorUserId: true },
  });
  if (!existing) return { ok: false, error: "Test topilmadi." };

  const role = session.user.role;
  if (role === "TEACHER") {
    if (existing.authorUserId !== session.user.id) return { ok: false, error: "Bu test sizga tegishli emas." };
  } else if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return { ok: false, error: "Rol mos emas." };
  }

  const title = input.title.trim();
  if (!title) return { ok: false, error: "Test nomi majburiy." };
  if (!input.subjectId) return { ok: false, error: "Fan tanlanishi kerak." };

  const subjectRow = await prisma.subject.findUnique({
    where: { id: input.subjectId },
    select: { id: true, gradeId: true },
  });
  if (!subjectRow) return { ok: false, error: "Fan topilmadi." };

  let gradeId: string | null = null;
  if (role === "TEACHER") {
    const gid = String(input.gradeId ?? "").trim();
    if (!gid) return { ok: false, error: "Sinf tanlanishi kerak." };
    const scope = await teacherCanComposeTest(session.user.id, {
      gradeId: gid,
      subjectId: input.subjectId,
      topicId: input.topicId ?? undefined,
    });
    if (!scope.ok) return { ok: false, error: scope.error };
    gradeId = gid;
  } else {
    gradeId = subjectRow.gradeId;
  }

  const qs = input.questions.filter((q) => q.text.trim() && q.options.filter(Boolean).length >= 2);
  if (!qs.length) return { ok: false, error: "Kamida bitta to‘liq savol kiriting." };

  let topicId: string | null = input.topicId?.trim() || null;
  const topicTitle = input.topicTitle?.trim();
  if (!topicId && topicTitle) {
    const created = await prisma.topic.create({
      data: { subjectId: input.subjectId, title: topicTitle, order: 0 },
    });
    topicId = created.id;
  }

  const startsAt = input.startsAt ? new Date(input.startsAt) : null;
  const endsAt = input.endsAt ? new Date(input.endsAt) : null;
  const maxAttempts = input.maxAttempts > 0 ? input.maxAttempts : null;
  const antiCheatMode = normalizeAntiCheat(input.antiCheatMode);
  let protectedExamMode = Boolean(input.protectedExamMode);
  let tabSwitchPolicy = (input.tabSwitchPolicy?.trim() || "AUTO_SUBMIT").toUpperCase();
  if (antiCheatMode === "STRICT") {
    protectedExamMode = true;
    tabSwitchPolicy = "AUTO_SUBMIT";
  }
  tabSwitchPolicy = ["WARNING", "AUTO_FAIL", "AUTO_SUBMIT"].includes(tabSwitchPolicy) ? tabSwitchPolicy : "AUTO_SUBMIT";
  const shuffleQuestions = input.shuffleQuestions !== false;
  const shuffleOptions = input.shuffleOptions !== false;
  const { status, isDraft, isActive } = deriveLifecycle(input);

  await prisma.$transaction(async (tx) => {
    await tx.question.deleteMany({ where: { testId } });
    await tx.test.update({
      where: { id: testId },
      data: {
        subjectId: input.subjectId,
        gradeId,
        topicId,
        title,
        description: input.description?.trim() || null,
        difficulty: input.difficulty || "MEDIUM",
        durationMinutes: input.durationMinutes || null,
        passScore: input.passScore,
        maxAttempts,
        isDraft,
        isActive,
        status,
        antiCheatMode,
        startsAt: startsAt && !Number.isNaN(startsAt.getTime()) ? startsAt : null,
        endsAt: endsAt && !Number.isNaN(endsAt.getTime()) ? endsAt : null,
        protectedExamMode,
        tabSwitchPolicy,
        shuffleQuestions,
        shuffleOptions,
        questions: {
          create: qs.map((q, order) => {
            const opts = q.options.map((o) => o.trim()).filter(Boolean);
            return {
              text: q.text.trim(),
              optionsJson: JSON.stringify(opts),
              correctIndex: Math.min(Math.max(0, q.correctIndex), Math.max(0, opts.length - 1)),
              order,
            };
          }),
        },
      },
    });
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "TEST_UPDATE",
    entityType: "Test",
    entityId: testId,
    metadata: { title, status },
  });

  revalidatePath("/oqituvchi/testlar");
  revalidatePath(`/oqituvchi/testlar/${testId}/tahrirlash`);
  revalidatePath("/admin/testlar");
  revalidatePath(`/admin/testlar/${testId}/tahrirlash`);
  revalidatePath(`/testlar/${testId}`);

  return { ok: true };
}

export async function deleteTest(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  const testId = String(formData.get("testId") ?? "").trim();
  if (!testId) return;

  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: { id: true, authorUserId: true },
  });
  if (!test) return;
  if (!canDeleteTest(session, test)) return;

  await prisma.test.delete({ where: { id: testId } });

  revalidatePath("/admin/testlar");
  revalidatePath("/oqituvchi/testlar");
  revalidatePath("/testlar");
}

export async function publishTestDraft(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  if (!sessionHasPermission(session, "TESTS_EDIT")) return;
  const id = String(formData.get("testId") ?? "").trim();
  if (!id) return;
  const test = await prisma.test.findUnique({ where: { id }, select: { id: true, authorUserId: true } });
  if (!test) return;
  if (session.user.role === "TEACHER") {
    if (test.authorUserId !== session.user.id) return;
  }
  await prisma.test.update({ where: { id }, data: { isDraft: false, isActive: true, status: "PUBLISHED" } });
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "TEST_PUBLISH",
    entityType: "Test",
    entityId: id,
    metadata: {},
  });
  revalidatePath("/admin/testlar");
  revalidatePath("/oqituvchi/testlar");
}
