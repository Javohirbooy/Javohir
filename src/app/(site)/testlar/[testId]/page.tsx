import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StudentExamBootstrap } from "@/components/tests/student-exam-bootstrap";
import { TEST_GRANT_COOKIE, studentCanOpenStudentTest } from "@/lib/test-access";
import { sessionHasPermission } from "@/lib/permissions";
import { adminCanOpenTestRunner, teacherCanOpenTestRunner } from "@/lib/test-policy";
import { getServerLocale } from "@/lib/i18n/resolve-locale";
import { formatTestMetaLine, t } from "@/lib/i18n/t";
import { buildPublicPageMetadata, buildTestDetailMetadata } from "@/lib/seo/public-page-metadata";
import { publicSeoEntry } from "@/lib/seo/public-seo-messages";
import { fetchCachedTestPreviewPack, fetchCachedTestSeo } from "@/lib/tests/public-test-queries";

const TestRunner = dynamic(
  () => import("@/components/tests/test-runner").then((m) => m.TestRunner),
  {
    ssr: true,
    loading: () => (
      <div className="animate-pulse rounded-2xl border border-emerald-200/30 bg-white/5 p-10 text-center text-sm text-slate-500">
        Yuklanmoqda…
      </div>
    ),
  },
);

type Props = { params: Promise<{ testId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await getServerLocale();
  const { testId } = await params;
  const test = await fetchCachedTestSeo(testId);
  if (!test) {
    const e = publicSeoEntry(locale, "testNotFound");
    return buildPublicPageMetadata({
      locale,
      canonicalPath: `/testlar/${testId}`,
      title: e.title,
      description: e.description,
      titleMode: "absolute",
      robots: { index: false, follow: false },
    });
  }
  return buildTestDetailMetadata({
    locale,
    testId,
    testTitle: test.title,
    testDescription: test.description,
    gradeNumber: test.subject.grade.number,
    subjectTitle: test.subject.title,
  });
}

export default async function TestTakePage({ params }: Props) {
  const locale = await getServerLocale();
  const { testId } = await params;
  const session = await auth();
  const grant = (await cookies()).get(TEST_GRANT_COOKIE)?.value;

  /** Og‘ir `questions` yukimasdan — ruxsat va yo‘naltirish (o‘quvchi uchun alohida `beginTestAttempt`). */
  const gate = await prisma.test.findUnique({
    where: { id: testId },
    select: {
      id: true,
      isDraft: true,
      isActive: true,
      status: true,
      startsAt: true,
      endsAt: true,
      authorUserId: true,
      subject: { select: { gradeId: true, title: true, grade: { select: { number: true } } } },
    },
  });
  if (!gate) notFound();

  if (session?.user?.role === "STUDENT") {
    if (!sessionHasPermission(session, "TESTS_ATTEMPT")) {
      redirect("/oquvchi");
    }
    const userRow = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { gradeId: true },
    });
    if (
      !studentCanOpenStudentTest(grant, userRow?.gradeId, {
        id: gate.id,
        isDraft: gate.isDraft,
        isActive: gate.isActive,
        status: gate.status,
        subject: { gradeId: gate.subject.gradeId },
      })
    ) {
      redirect("/testlar");
    }
  }

  if (session?.user?.role === "TEACHER") {
    if (!teacherCanOpenTestRunner(session, gate)) {
      redirect("/oqituvchi/testlar");
    }
  } else if (session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN") {
    if (!adminCanOpenTestRunner(session)) {
      redirect("/admin/testlar");
    }
  }

  const isStudentAttempt =
    session?.user?.role === "STUDENT" && sessionHasPermission(session, "TESTS_ATTEMPT");

  if (isStudentAttempt) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <StudentExamBootstrap testId={testId} />
      </div>
    );
  }

  const preview = !isStudentAttempt;
  const includeSolutions =
    preview && (session?.user?.role === "TEACHER" || session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN");

  const full = await fetchCachedTestPreviewPack(testId);
  if (!full) notFound();

  const questions = full.questions.map((q) => ({
    id: q.id,
    text: q.text,
    options: JSON.parse(q.optionsJson) as string[],
    ...(includeSolutions ? { correctIndex: q.correctIndex } : {}),
  }));

  const metaLine = formatTestMetaLine(locale, full.subject.grade.number, full.subject.title);

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      {preview ? (
        <p className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {t(locale, "tests.previewBanner")}
        </p>
      ) : null}
      <TestRunner
        testId={full.id}
        title={full.title}
        questions={questions}
        difficulty={full.difficulty}
        metaLine={metaLine}
        preview={preview}
      />
    </div>
  );
}
