import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { publishTestDraft } from "@/app/actions/teacher-tests";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { ImportQuestionPreview } from "@/components/question/import-question-preview";

type Props = { searchParams: Promise<{ id?: string }> };

export default async function AdminImportReviewPage({ searchParams }: Props) {
  const session = await auth();
  requirePermission(session, "TESTS_EDIT", { redirectTo: "/admin/testlar" });

  const id = (await searchParams)?.id?.trim();
  if (!id) redirect("/admin/testlar/import");

  const test = await prisma.test.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" } }, subject: { include: { grade: true } } },
  });
  if (!test) redirect("/admin/testlar/import");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Import — ko‘rib chiqish</h1>
          <p className="mt-1 text-sm text-white/60">
            {test.subject.grade.name} · {test.subject.title} · {test.questions.length} savol
          </p>
        </div>
        <Link href="/admin/testlar/import" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
          ← Qaytish
        </Link>
      </div>

      <DashboardCard>
        <h2 className="text-lg font-bold text-white">{test.title}</h2>
        <p className="mt-2 text-xs text-white/45">Manba: {test.sourceType}</p>
        <ul className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto text-sm">
          {test.questions.map((q, i) => (
            <li key={q.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <span className="font-semibold text-violet-200">{i + 1}.</span>{" "}
              <ImportQuestionPreview
                text={q.text}
                className="text-white/90 prose-invert [&_.katex]:text-white [&_img]:border [&_img]:border-white/10"
              />
            </li>
          ))}
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
