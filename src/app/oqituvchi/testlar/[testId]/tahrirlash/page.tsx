import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { TeacherTestCreateForm, type TeacherTestEditInitial } from "@/components/teacher/teacher-test-create-form";

type Props = { params: Promise<{ testId: string }> };

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function TeacherEditTestPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/kirish");
  const { testId } = await params;

  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: {
      questions: { orderBy: { order: "asc" } },
      testCodes: { where: { isActive: true }, take: 1 },
    },
  });
  if (!test) notFound();
  if (test.authorUserId !== session.user.id) redirect("/oqituvchi/testlar");

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

  const subjectRows = subjects.map((s) => ({
    id: s.id,
    title: s.title,
    gradeId: s.gradeId,
    gradeLabel: s.grade.name,
  }));

  const ownSubject = await prisma.subject.findUnique({
    where: { id: test.subjectId },
    include: { grade: true },
  });
  if (ownSubject && !subjectRows.some((s) => s.id === ownSubject.id)) {
    subjectRows.push({
      id: ownSubject.id,
      title: ownSubject.title,
      gradeId: ownSubject.gradeId,
      gradeLabel: ownSubject.grade.name,
    });
  }

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

  const gId = test.gradeId ?? subjects.find((s) => s.id === test.subjectId)?.gradeId ?? grades[0]?.id ?? "";

  const questions = test.questions.map((q) => {
    const opts = JSON.parse(q.optionsJson) as string[];
    const padded = [...opts, "", "", "", ""].slice(0, 4);
    return { text: q.text, options: padded, correctIndex: q.correctIndex };
  });

  const rawBundle = test.testCodes[0]?.grantedTestIdsJson;
  let bundleTestIds: string[] = [];
  if (rawBundle) {
    try {
      const j = JSON.parse(rawBundle) as unknown;
      if (Array.isArray(j)) bundleTestIds = j.filter((x): x is string => typeof x === "string");
    } catch {
      bundleTestIds = [];
    }
  }

  const bundleCandidates = await prisma.test.findMany({
    where: {
      authorUserId: session.user.id,
      gradeId: { in: gradeIds },
      id: { not: testId },
      isDraft: false,
      isActive: true,
      status: { not: "ARCHIVED" },
    },
    select: { id: true, title: true, gradeId: true, subject: { select: { title: true } } },
    orderBy: { title: "asc" },
  });
  const bundleTestOptions = bundleCandidates.map((t) => ({
    id: t.id,
    title: t.title,
    gradeId: t.gradeId ?? "",
    subjectTitle: t.subject.title,
  }));

  const edit: TeacherTestEditInitial = {
    testId: test.id,
    title: test.title,
    description: test.description ?? "",
    gradeId: gId,
    subjectId: test.subjectId,
    topicId: test.topicId ?? "",
    difficulty: test.difficulty,
    durationMinutes: test.durationMinutes ?? 30,
    passScore: test.passScore ?? 60,
    maxAttempts: test.maxAttempts ?? 1,
    startsAt: test.startsAt ? toDatetimeLocal(new Date(test.startsAt)) : "",
    endsAt: test.endsAt ? toDatetimeLocal(new Date(test.endsAt)) : "",
    manualTestCode: "",
    protectedExamMode: test.protectedExamMode,
    tabSwitchPolicy: test.tabSwitchPolicy,
    antiCheatMode: test.antiCheatMode,
    shuffleQuestions: test.shuffleQuestions,
    shuffleOptions: test.shuffleOptions,
    generateCode: !test.testCodes[0],
    questions,
    bundleTestIds,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Testni tahrirlash</h1>
        <p className="mt-1 text-sm text-white/60">{test.title}</p>
      </div>
      <TeacherTestCreateForm
        variant="teacher"
        grades={grades}
        subjects={subjectRows}
        topicsBySubjectId={topicsBySubjectId}
        defaultSubjectId={test.subjectId}
        afterPublishHref="/oqituvchi/testlar"
        edit={edit}
        bundleTestOptions={bundleTestOptions}
      />
    </div>
  );
}
