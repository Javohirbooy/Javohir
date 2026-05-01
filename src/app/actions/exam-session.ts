"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TEST_GRANT_COOKIE } from "@/lib/test-access";
import { sessionHasPermission } from "@/lib/permissions";
import { buildOptionPermutation, buildQuestionShuffle } from "@/lib/exam-shuffle";
import { writeAuditLog } from "@/lib/audit";
import { getServerLocale } from "@/lib/i18n/resolve-locale";
import { formatTestMetaLine } from "@/lib/i18n/t";

const FINISHED_STATUSES = [
  "SUBMITTED",
  "TERMINATED_VIOLATION",
  "AUTO_SUBMITTED_TIME",
  "AUTO_SUBMITTED_TAB",
  "EXPIRED",
] as const;

export type BeginAttemptResult =
  | { ok: false; error: string }
  | {
      ok: true;
      attemptId: string;
      sessionToken: string;
      title: string;
      difficulty: string;
      metaLine: string;
      questions: { id: string; text: string; options: string[] }[];
      durationMinutes: number | null;
      endsAtIso: string | null;
      remainingSeconds: number | null;
      protectedExamMode: boolean;
      tabSwitchPolicy: string;
    };

function rng() {
  return randomBytes(4).readUInt32LE(0) / 0xffffffff;
}

function rebuildDisplayQuestions(
  test: { questions: { id: string; text: string; optionsJson: string; order: number }[] },
  order: string[],
  perms: Record<string, number[]>,
) {
  const byId = new Map(test.questions.map((q) => [q.id, q]));
  const displayQuestions: { id: string; text: string; options: string[] }[] = [];
  for (const qid of order) {
    const q = byId.get(qid);
    if (!q) continue;
    const opts = JSON.parse(q.optionsJson) as string[];
    const perm = perms[qid] ?? opts.map((_, i) => i);
    const shown = perm.map((ci) => opts[ci]!);
    displayQuestions.push({ id: q.id, text: q.text, options: shown });
  }
  return displayQuestions;
}

function calcRemainingSeconds(endsAtIso: string | null): number | null {
  if (!endsAtIso) return null;
  return Math.max(1, Math.floor((new Date(endsAtIso).getTime() - Date.now()) / 1000));
}

async function resumeAttempt(attemptId: string, userId: string): Promise<BeginAttemptResult> {
  const locale = await getServerLocale();
  const attempt = await prisma.testAttempt.findFirst({
    where: { id: attemptId, userId, status: "IN_PROGRESS" },
    include: { test: { include: { subject: { include: { grade: true } }, questions: { orderBy: { order: "asc" } } } } },
  });
  if (!attempt?.test) return { ok: false, error: "Sessiya topilmadi." };
  if (!attempt.sessionToken) return { ok: false, error: "Sessiya yaroqsiz." };

  const order = JSON.parse(attempt.questionOrderJson) as string[];
  const perms = JSON.parse(attempt.optionPermutationsJson) as Record<string, number[]>;
  const displayQuestions = rebuildDisplayQuestions(attempt.test, order, perms);

  const durationMinutes = attempt.test.durationMinutes ?? null;
  let endsAtIso: string | null = null;
  if (durationMinutes != null) {
    endsAtIso = new Date(attempt.startedAt.getTime() + durationMinutes * 60 * 1000).toISOString();
  }
  if (attempt.test.endsAt) {
    const cap = attempt.test.endsAt.toISOString();
    if (!endsAtIso || new Date(cap) < new Date(endsAtIso)) endsAtIso = cap;
  }

  const g = attempt.test.subject.grade;
  return {
    ok: true,
    attemptId: attempt.id,
    sessionToken: attempt.sessionToken ?? "",
    title: attempt.test.title,
    difficulty: attempt.test.difficulty,
    metaLine: formatTestMetaLine(locale, g.number, attempt.test.subject.title),
    questions: displayQuestions,
    durationMinutes,
    endsAtIso,
    remainingSeconds: calcRemainingSeconds(endsAtIso),
    protectedExamMode: attempt.test.protectedExamMode,
    tabSwitchPolicy: attempt.test.tabSwitchPolicy,
  };
}

export async function beginTestAttempt(testId: string): Promise<BeginAttemptResult> {
  const locale = await getServerLocale();
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Kirish kerak." };
  if (session.user.role !== "STUDENT") return { ok: false, error: "Faqat o‘quvchilar." };
  if (!sessionHasPermission(session, "TESTS_ATTEMPT")) return { ok: false, error: "Ruxsat yo‘q." };

  const jar = await cookies();
  if (jar.get(TEST_GRANT_COOKIE)?.value !== testId) {
    return { ok: false, error: "Test kodi bilan ruxsat oling." };
  }

  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: { subject: { include: { grade: true } }, questions: { orderBy: { order: "asc" } } },
  });
  if (!test?.questions.length) return { ok: false, error: "Test topilmadi." };
  if (!test.isActive || test.isDraft || test.status === "ARCHIVED") {
    return { ok: false, error: "Test hozir ochilmagan." };
  }

  const t = new Date();
  if (test.startsAt && t < test.startsAt) return { ok: false, error: "Test vaqti hali boshlanmagan." };
  if (test.endsAt && t > test.endsAt) return { ok: false, error: "Test muddati tugagan." };

  const completed = await prisma.testAttempt.count({
    where: {
      userId: session.user.id,
      testId,
      status: { in: [...FINISHED_STATUSES] },
    },
  });
  if (test.maxAttempts != null && completed >= test.maxAttempts) {
    return { ok: false, error: "Urinishlar soni tugagan." };
  }

  const stale = new Date(Date.now() - 6 * 60 * 60 * 1000);
  await prisma.testAttempt.updateMany({
    where: { userId: session.user.id, testId, status: "IN_PROGRESS", startedAt: { lt: stale } },
    data: { status: "EXPIRED" },
  });

  const recentOpen = await prisma.testAttempt.findFirst({
    where: {
      userId: session.user.id,
      testId,
      status: "IN_PROGRESS",
      startedAt: { gte: new Date(Date.now() - 3 * 60 * 60 * 1000) },
    },
    orderBy: { startedAt: "desc" },
  });
  if (recentOpen?.sessionToken) {
    return resumeAttempt(recentOpen.id, session.user.id);
  }

  const qids = test.questions.map((q) => q.id);
  const order = buildQuestionShuffle(qids, test.shuffleQuestions, rng);
  const perms: Record<string, number[]> = {};
  const byId = new Map(test.questions.map((q) => [q.id, q]));

  for (const qid of order) {
    const q = byId.get(qid);
    if (!q) continue;
    const opts = JSON.parse(q.optionsJson) as string[];
    perms[qid] = buildOptionPermutation(opts.length, test.shuffleOptions, rng);
  }

  const displayQuestions = rebuildDisplayQuestions(test, order, perms);
  const sessionToken = randomBytes(24).toString("hex");

  const attempt = await prisma.testAttempt.create({
    data: {
      userId: session.user.id,
      testId,
      status: "IN_PROGRESS",
      questionOrderJson: JSON.stringify(order),
      optionPermutationsJson: JSON.stringify(perms),
      sessionToken,
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "EXAM_ATTEMPT_BEGIN",
    entityType: "TestAttempt",
    entityId: attempt.id,
    metadata: { testId },
  });

  const durationMinutes = test.durationMinutes ?? null;
  let endsAtIso: string | null = null;
  if (durationMinutes != null) {
    endsAtIso = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
  }
  if (test.endsAt) {
    const cap = test.endsAt.toISOString();
    if (!endsAtIso || new Date(cap) < new Date(endsAtIso)) endsAtIso = cap;
  }

  const g = test.subject.grade;
  return {
    ok: true,
    attemptId: attempt.id,
    sessionToken,
    title: test.title,
    difficulty: test.difficulty,
    metaLine: formatTestMetaLine(locale, g.number, test.subject.title),
    questions: displayQuestions,
    durationMinutes,
    endsAtIso,
    remainingSeconds: calcRemainingSeconds(endsAtIso),
    protectedExamMode: test.protectedExamMode,
    tabSwitchPolicy: test.tabSwitchPolicy,
  };
}

function serverDeadlineOk(startedAt: Date, test: { durationMinutes: number | null; endsAt: Date | null }): boolean {
  const now = Date.now();
  if (test.endsAt && now > test.endsAt.getTime()) return false;
  if (test.durationMinutes != null) {
    if (now > startedAt.getTime() + test.durationMinutes * 60 * 1000) return false;
  }
  return true;
}

export type SubmitExamResult =
  | { ok: false; error: string }
  | {
      ok: true;
      score: number;
      total: number;
      correct: number;
      questions: { text: string; options: string[]; correctIndex: number; userIndex: number }[];
    };

export type LogViolationResult =
  | { ok: false; error: string }
  | { ok: true; terminated?: boolean; submit?: SubmitExamResult };

export async function submitExamAttempt(
  attemptId: string,
  sessionToken: string,
  displayAnswers: number[],
  reason: "MANUAL" | "TIME" | "TAB" = "MANUAL",
): Promise<SubmitExamResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Kirish kerak." };
  if (session.user.role !== "STUDENT") return { ok: false, error: "Faqat o‘quvchilar." };

  const jar = await cookies();
  const attempt = await prisma.testAttempt.findFirst({
    where: { id: attemptId, userId: session.user.id },
    include: { test: { include: { questions: { orderBy: { order: "asc" } } } } },
  });
  if (!attempt?.test) return { ok: false, error: "Sessiya topilmadi." };
  if (attempt.sessionToken !== sessionToken) return { ok: false, error: "Sessiya yaroqsiz." };
  if (attempt.status !== "IN_PROGRESS") return { ok: false, error: "Sessiya yopilgan." };
  if (jar.get(TEST_GRANT_COOKIE)?.value !== attempt.testId) {
    return { ok: false, error: "Ruxsat cookie yo‘q." };
  }

  const test = attempt.test;
  if (reason === "MANUAL" && !serverDeadlineOk(attempt.startedAt, test)) {
    return { ok: false, error: "Test vaqti tugagan." };
  }

  const order = JSON.parse(attempt.questionOrderJson) as string[];
  const perms = JSON.parse(attempt.optionPermutationsJson) as Record<string, number[]>;
  if (displayAnswers.length !== order.length) {
    return { ok: false, error: "Javoblar soni noto‘g‘ri." };
  }

  const byId = new Map(test.questions.map((q) => [q.id, q]));
  let earned = 0;
  let maxPoints = 0;
  let correct = 0;
  const breakdown: { text: string; options: string[]; correctIndex: number; userIndex: number }[] = [];

  for (let i = 0; i < order.length; i++) {
    const qid = order[i]!;
    const q = byId.get(qid);
    if (!q) continue;
    const opts = JSON.parse(q.optionsJson) as string[];
    const perm = perms[qid] ?? opts.map((_, j) => j);
    const di = displayAnswers[i] ?? -1;
    const canonicalPick = di >= 0 && di < perm.length ? perm[di]! : -1;
    const ok = canonicalPick === q.correctIndex;
    const pts = q.points ?? 1;
    maxPoints += pts;
    if (ok) {
      earned += pts;
      correct += 1;
    }
    breakdown.push({
      text: q.text,
      options: opts,
      correctIndex: q.correctIndex,
      userIndex: canonicalPick,
    });
  }

  const score = maxPoints > 0 ? Math.round((earned / maxPoints) * 100) : 0;

  const status =
    reason === "TIME"
      ? "AUTO_SUBMITTED_TIME"
      : reason === "TAB"
        ? "AUTO_SUBMITTED_TAB"
        : "SUBMITTED";

  await prisma.$transaction(async (tx) => {
    await tx.testAttempt.update({
      where: { id: attemptId },
      data: {
        status,
        submittedAt: new Date(),
        score,
        answersJson: JSON.stringify(displayAnswers),
      },
    });
    await tx.testResult.create({
      data: {
        userId: session.user.id,
        testId: attempt.testId,
        score,
        answersJson: JSON.stringify(displayAnswers),
        attemptId,
      },
    });
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "EXAM_ATTEMPT_SUBMIT",
    entityType: "TestAttempt",
    entityId: attemptId,
    metadata: { testId: attempt.testId, score, reason },
  });

  revalidatePath("/oquvchi");
  revalidatePath("/testlar");
  revalidatePath("/reyting");

  return {
    ok: true,
    score,
    total: order.length,
    correct,
    questions: breakdown,
  };
}

export async function logExamViolation(
  attemptId: string,
  sessionToken: string,
  type: string,
  opts?: { answers?: number[] },
): Promise<
  | { ok: false; error: string }
  | { ok: true; terminated?: boolean; submit?: SubmitExamResult }
> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Kirish kerak." };

  const attempt = await prisma.testAttempt.findFirst({
    where: { id: attemptId, userId: session.user.id },
    include: { test: true },
  });
  if (!attempt || attempt.sessionToken !== sessionToken || attempt.status !== "IN_PROGRESS") {
    return { ok: false, error: "Sessiya yaroqsiz." };
  }

  await prisma.testViolation.create({
    data: {
      attemptId,
      type,
      detailJson: JSON.stringify({ at: new Date().toISOString() }),
    },
  });

  await prisma.testAttempt.update({
    where: { id: attemptId },
    data: { violationCount: { increment: 1 } },
  });

  const att = await prisma.testAttempt.findUnique({ where: { id: attemptId }, select: { violationCount: true } });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "EXAM_VIOLATION",
    entityType: "TestAttempt",
    entityId: attemptId,
    metadata: { type, count: att?.violationCount, testId: attempt.testId },
  });

  if (!attempt.test.protectedExamMode) {
    return { ok: true };
  }

  const policy = attempt.test.tabSwitchPolicy;
  if (policy === "AUTO_FAIL") {
    await prisma.testAttempt.update({
      where: { id: attemptId },
      data: { status: "TERMINATED_VIOLATION", submittedAt: new Date(), score: 0 },
    });
    return { ok: true, terminated: true };
  }
  if (policy === "AUTO_SUBMIT") {
    const orderLen = (JSON.parse(attempt.questionOrderJson) as string[]).length;
    const filler = Array.from({ length: orderLen }, () => -1);
    const answers = opts?.answers?.length === orderLen ? opts.answers : filler;
    const submit = await submitExamAttempt(attemptId, sessionToken, answers, "TAB");
    return { ok: true, terminated: true, submit };
  }

  return { ok: true };
}
