import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Difficulty } from "@/lib/difficulty";

/** `revalidateTag` — teacher/admin test o‘zgarishlarida. */
export const PUBLIC_TESTS_DATA_TAG = "public-tests-data";

export type TestsIndexCacheParams = {
  teacherId: string | null;
  query?: string;
  subjectTitle?: string;
  gradeNum?: number;
  difficulty?: Difficulty;
};

export function fetchCachedTestsIndex(params: TestsIndexCacheParams) {
  const { teacherId, query, subjectTitle, gradeNum, difficulty } = params;

  return unstable_cache(
    async () => {
      return prisma.test.findMany({
        where: {
          ...(teacherId ? { authorUserId: teacherId } : {}),
          ...(query
            ? {
                OR: [
                  { title: { contains: query, mode: "insensitive" } },
                  { description: { contains: query, mode: "insensitive" } },
                ],
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
        select: {
          id: true,
          title: true,
          difficulty: true,
          subject: { select: { title: true, grade: { select: { number: true } } } },
          _count: { select: { questions: true } },
        },
      });
    },
    [
      "tests-index-v1",
      teacherId ?? "anon",
      query ?? "",
      subjectTitle ?? "",
      String(gradeNum ?? ""),
      difficulty ?? "",
    ],
    { revalidate: 120, tags: [PUBLIC_TESTS_DATA_TAG] },
  )();
}

/** SEO / `generateMetadata` — yengil `select`. */
export function fetchCachedTestSeo(testId: string) {
  return unstable_cache(
    async () =>
      prisma.test.findUnique({
        where: { id: testId },
        select: {
          title: true,
          description: true,
          subject: { select: { title: true, grade: { select: { number: true } } } },
        },
      }),
    ["test-seo-v1", testId],
    /** Ko‘p qayta ochishda DB yuki kamroq (tezroq javob). */
    { revalidate: 120, tags: [PUBLIC_TESTS_DATA_TAG] },
  )();
}

/** O‘qituvchi/admin preview: savollar bilan (o‘quvchi yo‘lida chaqirilmaydi). */
export function fetchCachedTestPreviewPack(testId: string) {
  return unstable_cache(
    async () =>
      prisma.test.findUnique({
        where: { id: testId },
        select: {
          id: true,
          title: true,
          difficulty: true,
          questions: {
            orderBy: { order: "asc" },
            select: { id: true, text: true, optionsJson: true, correctIndex: true, points: true },
          },
          subject: { select: { title: true, grade: { select: { number: true } } } },
        },
      }),
    ["test-preview-v1", testId],
    { revalidate: 120, tags: [PUBLIC_TESTS_DATA_TAG] },
  )();
}
