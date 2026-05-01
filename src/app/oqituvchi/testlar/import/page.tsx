import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ImportTestForm } from "@/components/tests/import-test-form";

export default async function TeacherImportTestPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/kirish");

  const classes = await prisma.teacherOnClass.findMany({
    where: { userId: session.user.id },
    select: { gradeId: true },
  });
  const gradeIds = classes.map((c) => c.gradeId);

  const subjects = await prisma.subject.findMany({
    where: {
      gradeId: { in: gradeIds },
      teacherSubjects: { some: { userId: session.user.id } },
    },
    orderBy: [{ grade: { number: "asc" } }, { title: "asc" }],
    include: { grade: true },
  });

  const opts = subjects.map((s) => ({ id: s.id, title: s.title, gradeLabel: s.grade.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Test import</h1>
        <p className="mt-1 text-sm text-white/60">Faqat biriktirilgan fanlaringiz.</p>
      </div>
      {opts.length ? (
        <ImportTestForm subjects={opts} reviewBasePath="/oqituvchi/testlar/import/review" />
      ) : (
        <p className="text-sm text-white/55">Fanlar yo‘q.</p>
      )}
    </div>
  );
}
