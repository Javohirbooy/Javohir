import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { publishTestDraft } from "@/app/actions/teacher-tests";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { ImportQuestionPreview } from "@/components/question/import-question-preview";
import { testImportReviewSelect } from "@/lib/tests/test-query-selects";

type Props = { searchParams: Promise<{ id?: string }> };

const PREVIEW_CLASS =
  "prose-slate max-w-none [&_.katex]:text-slate-900 [&_p]:my-0 [&_img]:rounded-lg";

export default async function TeacherImportReviewPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/kirish");

  const id = (await searchParams)?.id?.trim();
  if (!id) redirect("/oqituvchi/testlar/import");

  const test = await prisma.test.findUnique({
    where: { id },
    select: testImportReviewSelect,
  });
  if (!test || test.authorUserId !== session.user.id) redirect("/oqituvchi/testlar/import");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Import — ko‘rib chiqish</h1>
          <p className="mt-1 text-sm text-white/60">
            {test.subject?.grade?.name ?? "—"} · {test.subject?.title ?? "—"}
          </p>
        </div>
        <Link href="/oqituvchi/testlar/import" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
          ← Qaytish
        </Link>
      </div>

      <DashboardCard>
        <h2 className="text-lg font-bold text-white">{test.title}</h2>
        <ul className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto text-sm">
          {test.questions.map((q, i) => {
            const opts = JSON.parse(q.optionsJson) as string[];
            const letters = ["A", "B", "C", "D"];
            return (
              <li key={q.id} className="rounded-xl border border-white/10 bg-white p-4 text-slate-900">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Savol {i + 1}</p>
                <ImportQuestionPreview text={q.text} className={PREVIEW_CLASS} />
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {opts.map((opt, oi) => (
                    <li
                      key={oi}
                      className={
                        oi === q.correctIndex
                          ? "rounded-lg border-2 border-emerald-500 bg-emerald-50 px-3 py-2"
                          : "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                      }
                    >
                      <span className="text-xs font-bold text-slate-500">{letters[oi]}) </span>
                      <ImportQuestionPreview text={opt} compact className={PREVIEW_CLASS} />
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
        <form action={publishTestDraft} className="mt-6">
          <input type="hidden" name="testId" value={test.id} />
          <button
            type="submit"
            className="rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 py-3 text-sm font-bold text-white shadow-lg"
          >
            Nashr qilish
          </button>
        </form>
      </DashboardCard>
    </div>
  );
}
