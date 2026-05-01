import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TestRunner } from "@/components/tests/test-runner";
import { StudentExamBootstrap } from "@/components/tests/student-exam-bootstrap";
import { TEST_GRANT_COOKIE } from "@/lib/test-access";
import { sessionHasPermission } from "@/lib/permissions";
import { adminCanOpenTestRunner, teacherCanOpenTestRunner } from "@/lib/test-policy";
import { getServerLocale } from "@/lib/i18n/resolve-locale";
import { formatTestMetaLine, t } from "@/lib/i18n/t";

type Props = { params: Promise<{ testId: string }> };

export default async function TestTakePage({ params }: Props) {
  const locale = await getServerLocale();
  const { testId } = await params;
  const session = await auth();
  const grant = (await cookies()).get(TEST_GRANT_COOKIE)?.value;

  if (session?.user?.role === "STUDENT") {
    if (!sessionHasPermission(session, "TESTS_ATTEMPT")) {
      redirect("/oquvchi");
    }
    if (grant !== testId) {
      redirect(`/oquvchi/test-kod?next=${encodeURIComponent(`/testlar/${testId}`)}`);
    }
  }

  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: {
      questions: { orderBy: { order: "asc" } },
      subject: { include: { grade: true } },
    },
  });
  if (!test) notFound();

  if (session?.user?.role === "TEACHER") {
    if (!teacherCanOpenTestRunner(session, test)) {
      redirect("/oqituvchi/testlar");
    }
  } else if (session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN") {
    if (!adminCanOpenTestRunner(session)) {
      redirect("/admin/testlar");
    }
  }

  const isStudentAttempt =
    session?.user?.role === "STUDENT" &&
    grant === testId &&
    sessionHasPermission(session, "TESTS_ATTEMPT");

  if (isStudentAttempt) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <StudentExamBootstrap testId={testId} />
      </div>
    );
  }

  const preview = !isStudentAttempt;
  const includeSolutions = preview && (session?.user?.role === "TEACHER" || session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN");

  const questions = test.questions.map((q) => ({
    id: q.id,
    text: q.text,
    options: JSON.parse(q.optionsJson) as string[],
    ...(includeSolutions ? { correctIndex: q.correctIndex } : {}),
  }));

  const metaLine = formatTestMetaLine(locale, test.subject.grade.number, test.subject.title);

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      {preview ? (
        <p className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {t(locale, "tests.previewBanner")}
        </p>
      ) : null}
      <TestRunner
        testId={test.id}
        title={test.title}
        questions={questions}
        difficulty={test.difficulty}
        metaLine={metaLine}
        preview={preview}
      />
    </div>
  );
}
