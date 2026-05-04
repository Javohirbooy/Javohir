import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardCard } from "@/components/dashboard/dashboard-card";

type Props = { params: Promise<{ testId: string }> };

export default async function TeacherTestResultsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/kirish");

  const { testId } = await params;

  const test = await prisma.test.findFirst({
    where: { id: testId, authorUserId: session.user.id },
    include: { subject: { include: { grade: true } } },
  });
  if (!test) notFound();

  const results = await prisma.testResult.findMany({
    where: { testId: test.id },
    orderBy: [{ score: "desc" }, { createdAt: "asc" }],
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Test natijalari</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-800">{test.title}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {test.subject.title} · {test.subject.grade.name} — o‘quvchilar ball bo‘yicha (eng yuqoridan)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/oqituvchi/testlar"
            className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50"
          >
            ← Testlar
          </Link>
          <Link
            href={`/oqituvchi/testlar/${test.id}/tahrirlash`}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
          >
            Tahrirlash
          </Link>
        </div>
      </div>

      <DashboardCard className="overflow-x-auto p-0">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-emerald-100 bg-emerald-50/70 text-xs uppercase tracking-wider text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">#</th>
              <th className="px-4 py-3 font-semibold">O‘quvchi</th>
              <th className="px-4 py-3 font-semibold text-right">Ball</th>
              <th className="px-4 py-3 font-semibold text-right">Vaqt</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={r.id} className="border-b border-emerald-100/70 text-slate-700 even:bg-white/65">
                <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-500">{i + 1}</td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-slate-800">{r.user.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">{r.user.email}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-lg font-bold tabular-nums text-emerald-700">
                  {Math.round(r.score)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-slate-500">
                  {r.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {results.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">Hali hech kim topshirmagan.</p>
        ) : null}
      </DashboardCard>
    </div>
  );
}
