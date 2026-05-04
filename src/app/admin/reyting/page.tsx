import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { DashboardCard } from "@/components/dashboard/dashboard-card";

export default async function AdminRankingPage() {
  const session = await auth();
  requirePermission(session, "RESULTS_VIEW_ALL", { redirectTo: "/admin" });

  const top = await prisma.testResult.findMany({
    orderBy: { score: "desc" },
    take: 15,
    include: { user: true, test: { include: { subject: { include: { grade: true } } } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">Reyting (admin)</h1>
        <p className="mt-1 text-sm text-slate-600">So‘nggi yuqori natijalar — global ko‘rinish.</p>
      </div>

      <DashboardCard className="border-emerald-300/40">
        <ol className="space-y-3">
          {top.map((r, i) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/55 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="iq-3d-chip flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-sm font-black text-white ring-1 ring-emerald-200">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800">{r.user.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {r.test.title} · {r.test.subject.grade.name}
                  </p>
                </div>
              </div>
              <span className="text-lg font-black tabular-nums text-emerald-700">{Math.round(r.score)} ball</span>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-center text-sm text-slate-600">
          Jamoat reytingi:{" "}
          <Link href="/reyting" className="font-semibold text-emerald-700 hover:text-emerald-600">
            /reyting
          </Link>
        </p>
      </DashboardCard>
    </div>
  );
}
