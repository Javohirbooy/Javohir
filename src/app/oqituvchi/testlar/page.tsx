import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { deleteTest } from "@/app/actions/teacher-tests";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Badge } from "@/components/ui/badge";
import { sessionHasPermission } from "@/lib/permissions";

function statusBadge(t: { status: string; isDraft: boolean; isActive: boolean }) {
  if (t.status === "ARCHIVED") {
    return <Badge className="border-slate-300 bg-slate-100 text-slate-700">Arxiv</Badge>;
  }
  if (t.status === "PUBLISHED" || (!t.isDraft && t.isActive)) {
    return <Badge className="border-emerald-300 bg-emerald-100 text-emerald-800">Nashr</Badge>;
  }
  return <Badge className="border-amber-300 bg-amber-100 text-amber-800">Qoralama</Badge>;
}

export default async function TeacherTestsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/kirish");

  // Teacher-owned tests: scalar FK `Test.authorUserId` → `User.id` (relation `author` on Test, `testsAuthored` on User).
  // Equivalent object: { authorUserId: "<same id as session.user.id>" }
  const tests = await prisma.test.findMany({
    where: { authorUserId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      subject: { include: { grade: true } },
      topic: true,
      testCodes: { where: { isActive: true }, take: 1 },
      _count: { select: { questions: true } },
    },
    take: 150,
  });

  const canDelete = sessionHasPermission(session, "TESTS_DELETE");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Testlar</h1>
          <p className="mt-1 text-sm text-slate-600">
            Faqat siz yaratgan testlar. Boshqa o‘qituvchi yoki platforma testlari bu yerda ko‘rinmaydi.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/oqituvchi/testlar/import"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
          >
            Import
          </Link>
          <Link
            href="/oqituvchi/testlar/yangi"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100"
          >
            + Yangi test
          </Link>
        </div>
      </div>

      <DashboardCard className="overflow-x-auto p-0">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-emerald-100 bg-emerald-50/70 text-xs uppercase tracking-wider text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Test</th>
              <th className="px-4 py-3 font-semibold">Fan / sinf</th>
              <th className="px-4 py-3 font-semibold">Mavzu</th>
              <th className="px-4 py-3 font-semibold">Holat</th>
              <th className="px-4 py-3 font-semibold">Yangilangan</th>
              <th className="px-4 py-3 font-semibold text-right">Amallar</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((t) => (
              <tr key={t.id} className="border-b border-emerald-100/70 text-slate-700 even:bg-white/65 hover:bg-emerald-50/55">
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-800">{t.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {t._count.questions} savol
                    {t.durationMinutes != null ? ` · ${t.durationMinutes} daq` : ""}
                    {t.testCodes[0] ? (
                      <span className="ml-2 font-mono text-sky-700">· {t.testCodes[0].code}</span>
                    ) : null}
                  </p>
                </td>
                <td className="px-4 py-4 text-slate-700">
                  {t.subject.title}
                  <br />
                  <span className="text-xs text-slate-500">{t.subject.grade.name}</span>
                </td>
                <td className="px-4 py-4 text-slate-600">{t.topic?.title ?? "—"}</td>
                <td className="px-4 py-4">{statusBadge(t)}</td>
                <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
                  {t.updatedAt.toISOString().slice(0, 16).replace("T", " ")}
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Link
                      href={`/oqituvchi/testlar/${t.id}/tahrirlash`}
                      className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-emerald-50"
                    >
                      Tahrirlash
                    </Link>
                    <Link
                      href={`/testlar/${t.id}`}
                      className="rounded-xl border border-sky-300/50 bg-sky-100/70 px-3 py-2 text-xs font-semibold text-sky-800 transition hover:bg-sky-200/70"
                    >
                      Ko‘rish
                    </Link>
                    {canDelete ? (
                      <form action={deleteTest} className="inline">
                        <input type="hidden" name="testId" value={t.id} />
                        <button
                          type="submit"
                          className="rounded-xl border border-rose-300/60 bg-rose-100/80 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-200/80"
                        >
                          O‘chirish
                        </button>
                      </form>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tests.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">Hozircha test yo‘q.</p> : null}
      </DashboardCard>
    </div>
  );
}
