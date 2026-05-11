import Link from "next/link";
import { auth } from "@/auth";
import { listOlympiadsForDashboard } from "@/app/actions/olympiad-admin";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/authz";

const BASE = "/admin/oimpiadalar";

export default async function AdminOlympiadsPage() {
  const session = await auth();
  requirePermission(session, "OLYMPIAD_MANAGE", { redirectTo: "/admin" });
  const rows = await listOlympiadsForDashboard();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Olimpiadalar</h1>
        <Button href={`${BASE}/yangi`} variant="secondary">
          Yangi olimpiada
        </Button>
      </div>
      <DashboardCard title="Ro‘yxat">
        <ul className="divide-y divide-slate-200 text-sm">
          {rows.length === 0 ? <li className="py-4 text-slate-600">Hozircha yozuvlar yo‘q.</li> : null}
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <Link href={`${BASE}/${r.id}`} className="font-semibold text-emerald-700 hover:underline">
                  {r.title}
                </Link>
                <p className="text-xs text-slate-600">
                  {r.test.title} · {new Date(r.startsAt).toLocaleString()} · holat: {r.status}
                </p>
              </div>
              <span className="text-xs text-slate-500">{r._count.participants} qatnashchi</span>
            </li>
          ))}
        </ul>
      </DashboardCard>
    </div>
  );
}
