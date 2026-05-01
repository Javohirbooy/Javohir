import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { LandingStatsGrid } from "@/components/home/landing-stats-grid";
import type { LandingStatItemDTO } from "@/components/home/landing-stats-types";
import { getServerLocale } from "@/lib/i18n/resolve-locale";
import { t } from "@/lib/i18n/t";
import type { AppLocale } from "@/lib/i18n/constants";

const getCachedCounts = unstable_cache(
  async () => {
    const [studentCount, testCount, avgRow] = await Promise.all([
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.test.count(),
      prisma.testResult.aggregate({ _avg: { score: true }, _count: { _all: true } }),
    ]);
    return { studentCount, testCount, avgRow };
  },
  ["landing-stats-counts"],
  { revalidate: 60 },
);

function fallbackItems(locale: AppLocale): LandingStatItemDTO[] {
  return [
    {
      label: t(locale, "home.statStudents"),
      value: "—",
      hint: t(locale, "home.statHintDbError"),
      icon: "users",
    },
    {
      label: t(locale, "home.statTests"),
      value: "—",
      hint: t(locale, "home.statHintCheckSettings"),
      icon: "fileQuestion",
    },
    {
      label: t(locale, "home.statAvg"),
      value: "—",
      hint: t(locale, "home.statHintAwaitResult"),
      icon: "target",
    },
    {
      label: t(locale, "home.statGrades"),
      value: "11",
      hint: t(locale, "home.statHintGrades"),
      icon: "graduationCap",
    },
  ];
}

export async function LandingStatsSection() {
  const locale = await getServerLocale();
  let items: LandingStatItemDTO[];

  try {
    const { studentCount, testCount, avgRow } = await getCachedCounts();

    const avg = avgRow._avg.score != null ? Math.round(avgRow._avg.score) : null;
    const hasResults = avgRow._count._all > 0;

    items = [
      {
        label: t(locale, "home.statStudents"),
        value: String(studentCount),
        hint: t(locale, "home.statHintStudentsOk"),
        icon: "users",
      },
      {
        label: t(locale, "home.statTests"),
        value: String(testCount),
        hint: t(locale, "home.statHintTestsOk"),
        icon: "fileQuestion",
      },
      {
        label: t(locale, "home.statAvg"),
        value: hasResults && avg != null ? `${avg}%` : "—",
        hint: hasResults ? t(locale, "home.statHintAvgSubmitted") : t(locale, "home.statHintAvgWait"),
        icon: "target",
      },
      {
        label: t(locale, "home.statGrades"),
        value: "11",
        hint: t(locale, "home.statHintGrades"),
        icon: "graduationCap",
      },
    ];
  } catch {
    items = fallbackItems(locale);
  }

  return <LandingStatsGrid items={items} />;
}
