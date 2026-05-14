"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sessionHasPermission } from "@/lib/permissions";
import { canDeleteTest } from "@/lib/test-policy";
import { teacherCanComposeTest } from "@/lib/teacher-scope";
import { writeAuditLog } from "@/lib/audit";
import type { ActionResult } from "@/lib/action-result";
import { errResult, okResult } from "@/lib/action-result";
import { PUBLIC_TESTS_DATA_TAG } from "@/lib/tests/public-test-queries";

export type TeacherQuestionInput = {
  text: string;
  options: string[];
  correctIndex: number;
  /** Question weight in points; must be greater than 0. Defaults to 1. */
  points?: number;
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

function parseSchedule(startsAtRaw?: string | null, endsAtRaw?: string | null) {
  const startsAt = startsAtRaw ? new Date(startsAtRaw) : null;
  const endsAt = endsAtRaw ? new Date(endsAtRaw) : null;
  if (startsAt && Number.isNaN(startsAt.getTime())) {
    return { ok: false as const, error: "Boshlanish vaqti noto‘g‘ri formatda." };
  }
  if (endsAt && Number.isNaN(endsAt.getTime())) {
    return { ok: false as const, error: "Yakunlanish vaqti noto‘g‘ri formatda." };
  }
  if (startsAt && endsAt && endsAt <= startsAt) {
    return { ok: false as const, error: "Yakunlanish vaqti boshlanishdan keyin bo‘lishi kerak." };
  }
  return { ok: true as const, startsAt, endsAt };
}

/**
 * Creates a test. Session role decides ownership:
 * - TEACHER → `authorUserId` = self (must have relational class + subject assignment).
 * - ADMIN / SUPER_ADMIN → `authorUserId` = null (platform test).
 */
export async function createTest(input: CreateTeacherTestInput) {
  const session = await auth();
  if (!session?.user?.id) return errResult("Kirish talab qilinadi.", "UNAUTHENTICATED");
  if (!sessionHasPermission(session, "TESTS_CREATE")) {
    return errResult("Test yaratish huquqi yo‘q.", "FORBIDDEN");
  }

  const title = input.title.trim();
  if (!title) return errResult("Test nomi majburiy.", "VALIDATION_ERROR");
  if (!input.subjectId) return errResult("Fan tanlanishi kerak.", "VALIDATION_ERROR");

  const subjectRow = await prisma.subject.findUnique({
    where: { id: input.subjectId },
    select: { id: true, gradeId: true },
  });
  if (!subjectRow) return errResult("Fan topilmadi.", "NOT_FOUND");

  const role = session.user.role;
  let authorUserId: string | null = null;
  let gradeId: string | null = null;

  if (role === "TEACHER") {
    const gid = String(input.gradeId ?? "").trim();
    if (!gid) return errResult("Sinf tanlanishi kerak.", "VALIDATION_ERROR");
    const scope = await teacherCanComposeTest(session.user.id, {
      gradeId: gid,
      subjectId: input.subjectId,
      topicId: input.topicId ?? undefined,
    });
    if (!scope.ok) return errResult(scope.error, "FORBIDDEN");
    authorUserId = session.user.id;
    gradeId = gid;
  } else if (role === "ADMIN" || role === "SUPER_ADMIN") {
    authorUserId = null;
    gradeId = subjectRow.gradeId;
  } else {
    return errResult("Bu amal uchun rol mos emas.", "FORBIDDEN");
  }

  const qs = input.questions.filter((q) => q.text.trim() && q.options.filter(Boolean).length >= 2);
  if (!qs.length) return errResult("Kamida bitta to‘liq savol kiriting.", "VALIDATION_ERROR");
  for (const q of qs) {
    const pts = q.points ?? 1;
    if (typeof pts !== "number" || !Number.isFinite(pts) || pts <= 0) {
      return errResult("Har bir savol uchun ball musbat son bo‘lishi kerak.", "VALIDATION_ERROR");
    }
  }

  let topicId: string | null = input.topicId?.trim() || null;
  const topicTitle = input.topicTitle?.trim();
  if (!topicId && topicTitle) {
    const created = await prisma.topic.create({
      data: { subjectId: input.subjectId, title: topicTitle, order: 0 },
    });
    topicId = created.id;
  }

  const schedule = parseSchedule(input.startsAt, input.endsAt);
  if (!schedule.ok) return errResult(schedule.error, "VALIDATION_ERROR");
  const { startsAt, endsAt } = schedule;
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
      startsAt,
      endsAt,
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
            points: q.points ?? 1,
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
  revalidateTag(PUBLIC_TESTS_DATA_TAG, "max");

  return okResult({ testId: test.id }, "OK");
}

export async function updateTeacherTest(
  testId: string,
  input: CreateTeacherTestInput,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return errResult("Kirish talab qilinadi.", "UNAUTHENTICATED");
  if (!sessionHasPermission(session, "TESTS_EDIT")) return errResult("Tahrirlash huquqi yo‘q.", "FORBIDDEN");

  const existing = await prisma.test.findUnique({
    where: { id: testId },
    select: { id: true, authorUserId: true },
  });
  if (!existing) return errResult("Test topilmadi.", "NOT_FOUND");

  const role = session.user.role;
  if (role === "TEACHER") {
    if (existing.authorUserId !== session.user.id) return errResult("Bu test sizga tegishli emas.", "FORBIDDEN");
  } else if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return errResult("Rol mos emas.", "FORBIDDEN");
  }

  const title = input.title.trim();
  if (!title) return errResult("Test nomi majburiy.", "VALIDATION_ERROR");
  if (!input.subjectId) return errResult("Fan tanlanishi kerak.", "VALIDATION_ERROR");

  const subjectRow = await prisma.subject.findUnique({
    where: { id: input.subjectId },
    select: { id: true, gradeId: true },
  });
  if (!subjectRow) return errResult("Fan topilmadi.", "NOT_FOUND");

  let gradeId: string | null = null;
  if (role === "TEACHER") {
    const gid = String(input.gradeId ?? "").trim();
    if (!gid) return errResult("Sinf tanlanishi kerak.", "VALIDATION_ERROR");
    const scope = await teacherCanComposeTest(session.user.id, {
      gradeId: gid,
      subjectId: input.subjectId,
      topicId: input.topicId ?? undefined,
    });
    if (!scope.ok) return errResult(scope.error, "FORBIDDEN");
    gradeId = gid;
  } else {
    gradeId = subjectRow.gradeId;
  }

  const qs = input.questions.filter((q) => q.text.trim() && q.options.filter(Boolean).length >= 2);
  if (!qs.length) return errResult("Kamida bitta to‘liq savol kiriting.", "VALIDATION_ERROR");
  for (const q of qs) {
    const pts = q.points ?? 1;
    if (typeof pts !== "number" || !Number.isFinite(pts) || pts <= 0) {
      return errResult("Har bir savol uchun ball musbat son bo‘lishi kerak.", "VALIDATION_ERROR");
    }
  }

  let topicId: string | null = input.topicId?.trim() || null;
  const topicTitle = input.topicTitle?.trim();
  if (!topicId && topicTitle) {
    const created = await prisma.topic.create({
      data: { subjectId: input.subjectId, title: topicTitle, order: 0 },
    });
    topicId = created.id;
  }

  const schedule = parseSchedule(input.startsAt, input.endsAt);
  if (!schedule.ok) return errResult(schedule.error, "VALIDATION_ERROR");
  const { startsAt, endsAt } = schedule;
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
        startsAt,
        endsAt,
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
              points: q.points ?? 1,
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
  revalidateTag(PUBLIC_TESTS_DATA_TAG, "max");

  return okResult(undefined, "OK");
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
  revalidateTag(PUBLIC_TESTS_DATA_TAG, "max");
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
  revalidatePath("/testlar");
  revalidatePath(`/testlar/${id}`);
  revalidateTag(PUBLIC_TESTS_DATA_TAG, "max");
}
