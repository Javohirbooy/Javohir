import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

export type TeacherComposeScope = {
  gradeId: string;
  subjectId: string;
  topicId?: string | null;
};

/**
 * Server-side gate for creating/editing tests: assigned class + assigned subject,
 * subject must belong to the selected grade, optional topic must belong to the subject.
 */
export async function teacherCanComposeTest(
  teacherUserId: string,
  params: TeacherComposeScope,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const classOk = await prisma.teacherOnClass.findFirst({
    where: { userId: teacherUserId, gradeId: params.gradeId },
    select: { id: true },
  });
  if (!classOk) return { ok: false, error: "Tanlangan sinf sizga biriktirilmagan." };

  const subjectOk = await prisma.teacherSubjectAssignment.findFirst({
    where: { userId: teacherUserId, subjectId: params.subjectId },
    select: { id: true },
  });
  if (!subjectOk) return { ok: false, error: "Tanlangan fan sizga biriktirilmagan." };

  const subject = await prisma.subject.findUnique({
    where: { id: params.subjectId },
    select: { gradeId: true },
  });
  if (!subject) return { ok: false, error: "Fan topilmadi." };
  if (subject.gradeId !== params.gradeId) {
    return { ok: false, error: "Fan tanlangan sinfga tegishli emas." };
  }

  if (params.topicId) {
    const topic = await prisma.topic.findUnique({
      where: { id: params.topicId },
      select: { subjectId: true },
    });
    if (!topic || topic.subjectId !== params.subjectId) {
      return { ok: false, error: "Mavzu tanlangan fanga tegishli emas." };
    }
  }

  return { ok: true };
}

/** Teacher must have both class (grade) and subject assignments. */
export async function teacherHasSubjectAccess(teacherUserId: string, subjectId: string): Promise<boolean> {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { id: true, gradeId: true },
  });
  if (!subject) return false;

  const [gradeOk, subjectOk] = await Promise.all([
    prisma.teacherOnClass.findFirst({
      where: { userId: teacherUserId, gradeId: subject.gradeId },
      select: { id: true },
    }),
    prisma.teacherSubjectAssignment.findFirst({
      where: { userId: teacherUserId, subjectId: subject.id },
      select: { id: true },
    }),
  ]);

  return Boolean(gradeOk && subjectOk);
}

export async function teacherManagesStudent(teacherUserId: string, studentUserId: string): Promise<boolean> {
  const link = await prisma.teacherStudentLink.findUnique({
    where: { studentUserId },
    select: { teacherUserId: true },
  });
  return link?.teacherUserId === teacherUserId;
}

export async function assertTeacherManagesStudent(session: Session, studentUserId: string): Promise<boolean> {
  if (session.user.role !== "TEACHER") return false;
  return teacherManagesStudent(session.user.id, studentUserId);
}

export async function assertTeacherSubjectAccess(session: Session, subjectId: string): Promise<boolean> {
  if (session.user.role !== "TEACHER") return false;
  return teacherHasSubjectAccess(session.user.id, subjectId);
}
