import bcrypt from "bcryptjs";
import { prisma } from "./seed";

/**
 * Agar `Permission` jadvali to‘ldirilgan bo‘lsa, STUDENT uchun `TESTS_ATTEMPT` bo‘lmasa
 * sessiyada ruxsat bo‘lmaydi — e2e dan oldin qo‘shamiz.
 */
export async function ensureStudentTestAttemptPermission() {
  const n = await prisma.permission.count();
  if (n === 0) return;
  const perm = await prisma.permission.findUnique({ where: { key: "TESTS_ATTEMPT" } });
  if (!perm) return;
  await prisma.rolePermission.createMany({
    data: [{ role: "STUDENT", permissionId: perm.id }],
    skipDuplicates: true,
  });
}

/** Bitta e2e testi uchun sinf + fan + nashr etilgan test (shuffle o‘chiq — UI indekslari barqaror). */
export async function createPublishedTestForStudentGrade() {
  const gradeNumber = 1_000_000 + Math.floor(Math.random() * 8_000_000);
  const grade = await prisma.grade.create({
    data: { number: gradeNumber, name: `${gradeNumber}-e2e`, colorKey: "emerald" },
  });
  const subject = await prisma.subject.create({
    data: {
      gradeId: grade.id,
      title: "E2E fan",
      description: "E2E",
    },
  });
  const test = await prisma.test.create({
    data: {
      subjectId: subject.id,
      title: "E2E test topshirish",
      isDraft: false,
      isActive: true,
      status: "PUBLISHED",
      gradeId: grade.id,
      shuffleQuestions: false,
      shuffleOptions: false,
      protectedExamMode: false,
      durationMinutes: 60,
      maxAttempts: null,
    },
  });
  await prisma.question.createMany({
    data: [
      {
        testId: test.id,
        text: "2 + 2 = ?",
        optionsJson: JSON.stringify(["3", "4", "5"]),
        correctIndex: 1,
        order: 0,
      },
      {
        testId: test.id,
        text: "Fransiya poytaxti?",
        optionsJson: JSON.stringify(["Berlin", "Paris", "Rim"]),
        correctIndex: 1,
        order: 1,
      },
    ],
  });
  return { gradeId: grade.id, testId: test.id };
}

export async function createActiveStudentInGrade(email: string, password: string, name: string, gradeId: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: "STUDENT",
      status: "ACTIVE",
      emailVerified: true,
      gradeId,
    },
  });
}

export async function deleteExamFixture(testId: string, gradeId: string) {
  await prisma.testResult.deleteMany({ where: { testId } });
  await prisma.testAttempt.deleteMany({ where: { testId } });
  await prisma.testCode.deleteMany({ where: { testId } });
  await prisma.question.deleteMany({ where: { testId } });
  const t = await prisma.test.findUnique({ where: { id: testId }, select: { subjectId: true } });
  await prisma.test.deleteMany({ where: { id: testId } });
  if (t?.subjectId) {
    await prisma.subject.deleteMany({ where: { id: t.subjectId } });
  }
  await prisma.grade.deleteMany({ where: { id: gradeId } });
}
