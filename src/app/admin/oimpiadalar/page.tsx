import Link from "next/link";
import { auth } from "@/auth";
import { listOlympiadsForDashboard } from "@/app/actions/olympiad-admin";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { DashboardDbErrorFallback } from "@/components/dashboard/dashboard-db-error-fallback";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/authz";
import { canOlympiadManage } from "@/lib/permissions";
import { tryPrismaPage } from "@/lib/server/try-prisma";
import { redirect } from "next/navigation";

const BASE = "/admin/oimpiadalar";

export default async function AdminOlympiadsPage() {
  const session = await auth();
  requireAuth(session);
  if (!canOlympiadManage(session)) redirect("/admin");
  const load = await tryPrismaPage("admin.olympiads_list", () => listOlympiadsForDashboard(), {
    actorId: session.user.id,
  });
  if (!load.ok) return <DashboardDbErrorFallback retryHref="/admin/oimpiadalar" />;
  const rows = load.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Olimpiadalar</h1>
        <div className="flex flex-wrap gap-2">
          <Button href={`${BASE}/natijalar`} variant="secondary">
            Olimpiada natijalari
          </Button>
          <Button href={`${BASE}/yangi`} variant="secondary">
            Yangi olimpiada
          </Button>
        </div>
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
