import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SectionTitle } from "@/components/ui/section-title";
import { Card } from "@/components/ui/card";
import { TestFilterBar } from "@/components/tests/test-filter-bar";
import { TestCard, type TestCardModel } from "@/components/ui/test-card";
import { DIFFICULTIES, type Difficulty } from "@/lib/difficulty";
import { getServerLocale } from "@/lib/i18n/resolve-locale";
import { t } from "@/lib/i18n/t";
import Link from "next/link";

type Props = { searchParams: Promise<{ q?: string; subject?: string; grade?: string; difficulty?: string }> };

export default async function TestsIndexPage({ searchParams }: Props) {
  const locale = await getServerLocale();
  const session = await auth();

  const sp = await searchParams;
  const query = sp.q?.trim() || undefined;
  const subjectTitle = sp.subject?.trim() || undefined;
  const gradeRaw = sp.grade ? Number.parseInt(sp.grade, 10) : NaN;
  const gradeNum = Number.isFinite(gradeRaw) && gradeRaw >= 1 && gradeRaw <= 11 ? gradeRaw : undefined;
  const diffRaw = sp.difficulty?.toUpperCase().trim();
  const difficulty =
    diffRaw && (DIFFICULTIES as readonly string[]).includes(diffRaw) ? (diffRaw as Difficulty) : undefined;

  const tests = await prisma.test.findMany({
    where: {
      ...(session?.user?.role === "TEACHER" && session.user.id ? { authorUserId: session.user.id } : {}),
      ...(query
        ? {
            OR: [{ title: { contains: query, mode: "insensitive" } }, { description: { contains: query, mode: "insensitive" } }],
          }
        : {}),
      subject: {
        ...(subjectTitle ? { title: subjectTitle } : {}),
        ...(gradeNum != null ? { grade: { number: gradeNum } } : {}),
      },
      ...(difficulty ? { difficulty } : {}),
    },
    take: 48,
    orderBy: [{ subject: { grade: { number: "asc" } } }, { title: "asc" }],
    include: {
      subject: { include: { grade: true } },
      _count: { select: { questions: true } },
    },
  });

  const cards: TestCardModel[] = tests.map((t) => ({
    id: t.id,
    title: t.title,
    difficulty: t.difficulty,
    questionCount: t._count.questions,
    gradeNumber: t.subject.grade.number,
    subjectTitle: t.subject.title,
  }));
  const clearQParams = new URLSearchParams({
    ...(subjectTitle ? { subject: subjectTitle } : {}),
    ...(gradeNum != null ? { grade: String(gradeNum) } : {}),
    ...(difficulty ? { difficulty } : {}),
  });
  const clearQHref = clearQParams.toString() ? `/testlar?${clearQParams.toString()}` : "/testlar";

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
      <SectionTitle
        onDark
        eyebrow={t(locale, "tests.indexEyebrow")}
        title={t(locale, "tests.indexTitle")}
        subtitle={t(locale, "tests.indexSubtitle")}
      />

      <div className="mt-10 rounded-3xl border border-emerald-100 bg-white/85 p-6 shadow-xl shadow-emerald-900/10 backdrop-blur-xl sm:p-8">
        <form className="mb-5">
          <input type="hidden" name="subject" value={subjectTitle ?? ""} />
          <input type="hidden" name="grade" value={gradeNum ?? ""} />
          <input type="hidden" name="difficulty" value={difficulty ?? ""} />
          <div className="flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={query ?? ""}
              placeholder="Test nomi bo‘yicha qidiruv…"
              className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none ring-emerald-500/30 focus:ring-2"
            />
            {query ? (
              <Link
                href={clearQHref}
                className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                ×
              </Link>
            ) : null}
          </div>
        </form>
        <TestFilterBar activeQuery={query ?? null} activeSubject={subjectTitle} activeGrade={gradeNum ?? null} activeDifficulty={difficulty ?? null} />
      </div>

      {cards.length === 0 ? (
        <Card className="mt-10 border-emerald-100 bg-white p-10 text-center text-slate-700 backdrop-blur-xl">
          <p className="font-semibold text-slate-800">{t(locale, "tests.emptyTitle")}</p>
          <p className="mt-2 text-sm text-slate-600">{t(locale, "tests.emptyHint")}</p>
          <Link
            href="/testlar"
            className="mt-6 inline-flex rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg"
          >
            {t(locale, "tests.clearFilters")}
          </Link>
        </Card>
      ) : (
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {cards.map((t) => (
            <TestCard key={t.id} test={t} />
          ))}
        </div>
      )}
    </div>
  );
}
