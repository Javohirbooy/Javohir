import type { Prisma } from "@prisma/client";

/**
 * Test jadvalidagi katta matnlar (`importRawText`, `importMetadataJson`, …) ro‘yxat / metadata
 * sahifalarida kerak emas — ularni yuklamaslik RSC va DB yukini sezilarli kamaytiradi.
 */

export const testQuestionFormSelect = {
  id: true,
  text: true,
  optionsJson: true,
  correctIndex: true,
  order: true,
  points: true,
} satisfies Prisma.QuestionSelect;

/** Admin testlar katalogi (yengil). */
export const testAdminCatalogListSelect = {
  id: true,
  title: true,
  difficulty: true,
  isDraft: true,
  isActive: true,
  authorUserId: true,
  subject: {
    select: {
      title: true,
      grade: { select: { name: true } },
    },
  },
  _count: { select: { questions: true, results: true } },
} satisfies Prisma.TestSelect;

/** O‘qituvchi testlar ro‘yxati. */
export const testTeacherAdminListSelect = {
  id: true,
  title: true,
  difficulty: true,
  durationMinutes: true,
  updatedAt: true,
  status: true,
  isDraft: true,
  isActive: true,
  authorUserId: true,
  subject: {
    select: {
      title: true,
      grade: { select: { name: true } },
    },
  },
  topic: { select: { title: true } },
  _count: { select: { questions: true, results: true } },
} satisfies Prisma.TestSelect;

/** O‘quvchi monitoring testlari ro‘yxati. */
export const testStudentMonitoringListSelect = {
  id: true,
  title: true,
  subject: {
    select: {
      title: true,
      grade: { select: { number: true } },
    },
  },
} satisfies Prisma.TestSelect;

/** Tahrirlash formasi (savollar bilan), import manbasi yo‘q. */
export const testFormEditSelect = {
  id: true,
  title: true,
  description: true,
  gradeId: true,
  subjectId: true,
  topicId: true,
  difficulty: true,
  durationMinutes: true,
  passScore: true,
  maxAttempts: true,
  startsAt: true,
  endsAt: true,
  protectedExamMode: true,
  tabSwitchPolicy: true,
  antiCheatMode: true,
  shuffleQuestions: true,
  shuffleOptions: true,
  authorUserId: true,
  questions: {
    orderBy: { order: "asc" as const },
    select: testQuestionFormSelect,
  },
} satisfies Prisma.TestSelect;

/** Importdan keyin ko‘rib chiqish. */
export const testImportReviewSelect = {
  id: true,
  title: true,
  sourceType: true,
  authorUserId: true,
  subject: {
    select: {
      title: true,
      grade: { select: { name: true } },
    },
  },
  questions: {
    orderBy: { order: "asc" as const },
    select: { id: true, text: true, optionsJson: true, correctIndex: true },
  },
} satisfies Prisma.TestSelect;

/** Olimpiada: savollar + sarlavha (ball hisobi uchun to‘liq savol maydonlari). */
export const testOlympiadQuestionPackSelect = {
  id: true,
  title: true,
  questions: {
    orderBy: { order: "asc" as const },
    select: {
      id: true,
      text: true,
      optionsJson: true,
      correctIndex: true,
      points: true,
    },
  },
} satisfies Prisma.TestSelect;

/** O‘qituvchi natijalar sarlavhasi. */
export const testResultsHeaderSelect = {
  id: true,
  title: true,
  subject: {
    select: {
      title: true,
      grade: { select: { name: true } },
    },
  },
} satisfies Prisma.TestSelect;

/** Fan tanlovi (tahrirlash) — tavsif va emoji yuklamaymiz. */
export const subjectOptionWithGradeSelect = {
  id: true,
  title: true,
  gradeId: true,
  grade: { select: { name: true, number: true } },
} satisfies Prisma.SubjectSelect;
