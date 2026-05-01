import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { TeacherTestCreateForm } from "@/components/teacher/teacher-test-create-form";

type Props = { searchParams?: Promise<{ subjectId?: string }> };

export default async function AdminNewTestPage({ searchParams }: Props) {
  const session = await auth();
  requirePermission(session, "TESTS_CREATE", { redirectTo: "/admin/testlar" });

  const sp = (await searchParams) ?? {};
  const defaultSubjectId = sp.subjectId;

  const subjects = await prisma.subject.findMany({
    orderBy: [{ grade: { number: "asc" } }, { title: "asc" }],
    include: { grade: true },
  });

  if (!subjects.length) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/70">
        Avval fanlar katalogida fanlar bo‘lishi kerak.
      </div>
    );
  }

  const opts = subjects.map((s) => ({
    id: s.id,
    title: s.title,
    gradeId: s.gradeId,
    gradeLabel: s.grade.name,
  }));

  const resolvedDefault =
    defaultSubjectId && subjects.some((s) => s.id === defaultSubjectId) ? defaultSubjectId : undefined;

  const bundleCandidates = await prisma.test.findMany({
    where: {
      authorUserId: null,
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Yangi test (admin)</h1>
        <p className="mt-1 text-sm text-white/60">
          Platforma testi — barcha sinflar uchun. O‘qituvchilar panelida bu testlar tahrirlanmaydi.
        </p>
      </div>
      <TeacherTestCreateForm
        variant="admin"
        subjects={opts}
        defaultSubjectId={resolvedDefault}
        afterPublishHref="/admin/testlar"
        bundleTestOptions={bundleTestOptions}
      />
    </div>
  );
}
