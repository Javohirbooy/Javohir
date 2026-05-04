import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TeacherTestCreateForm } from "@/components/teacher/teacher-test-create-form";

type Props = { searchParams?: Promise<{ subjectId?: string }> };

export default async function TeacherNewTestPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/kirish");

  const sp = (await searchParams) ?? {};
  const defaultSubjectId = sp.subjectId;

  const [classes, subjectAssignments] = await Promise.all([
    prisma.teacherOnClass.findMany({
      where: { userId: session.user.id },
      include: { grade: true },
      orderBy: { grade: { number: "asc" } },
    }),
    prisma.teacherSubjectAssignment.findMany({
      where: { userId: session.user.id },
      select: { subjectId: true },
    }),
  ]);

  const allowedSubjectIds = new Set(subjectAssignments.map((a) => a.subjectId));
  const gradeIds = classes.map((c) => c.gradeId);

  const subjects = await prisma.subject.findMany({
    where: {
      id: { in: [...allowedSubjectIds] },
      gradeId: { in: gradeIds },
    },
    orderBy: [{ grade: { number: "asc" } }, { title: "asc" }],
    include: { grade: true },
  });

  if (!classes.length) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/70">
        Avval administrator sizga sinf biriktirishi kerak.
      </div>
    );
  }

  if (!subjects.length) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/70">
        Sizga fanlar biriktirilmagan yoki ular biriktirilgan sinflarga mos kelmaydi. Administrator bilan bog‘laning.
      </div>
    );
  }

  const subjectRows = subjects.map((s) => ({
    id: s.id,
    title: s.title,
    gradeId: s.gradeId,
    gradeLabel: s.grade.name,
  }));

  const topics = await prisma.topic.findMany({
    where: { subjectId: { in: subjects.map((s) => s.id) } },
    orderBy: [{ subjectId: "asc" }, { order: "asc" }],
    select: { id: true, subjectId: true, title: true },
  });
  const topicsBySubjectId: Record<string, { id: string; title: string }[]> = {};
  for (const t of topics) {
    if (!topicsBySubjectId[t.subjectId]) topicsBySubjectId[t.subjectId] = [];
    topicsBySubjectId[t.subjectId]!.push({ id: t.id, title: t.title });
  }

  const grades = classes.map((c) => ({
    id: c.grade.id,
    name: c.grade.name,
    number: c.grade.number,
  }));

  const resolvedDefault =
    defaultSubjectId && subjects.some((s) => s.id === defaultSubjectId) ? defaultSubjectId : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Yangi test</h1>
        <p className="mt-1 text-sm text-white/60">
          Faqat sizga biriktirilgan sinf va fanlar bo‘yicha. Barcha tekshiruvlar serverda bajariladi.
        </p>
      </div>
      <TeacherTestCreateForm
        variant="teacher"
        grades={grades}
        subjects={subjectRows}
        topicsBySubjectId={topicsBySubjectId}
        defaultSubjectId={resolvedDefault}
        afterPublishHref="/oqituvchi/testlar"
      />
    </div>
  );
}
