import { getOlympiadFinalizationInsights, manualFinalizeOlympiadSessionFormAction } from "@/app/actions/olympiad-admin";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Button } from "@/components/ui/button";

export async function OlympiadFinalizationSection({ olympiadId, basePath }: { olympiadId: string; basePath: string }) {
  const insights = await getOlympiadFinalizationInsights(olympiadId);
  if (!insights) return null;

  return (
    <DashboardCard title="Yakunlash (worker / admin)">
      <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase text-slate-500">Avto yakunlangan</p>
          <p className="text-2xl font-bold text-slate-900">{insights.autoFinalizedCount}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2">
          <p className="text-xs font-semibold uppercase text-amber-800">Uzilgan (timeout)</p>
          <p className="text-2xl font-bold text-amber-950">{insights.disconnectedTimeoutCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase text-slate-500">Admin yopgan</p>
          <p className="text-2xl font-bold text-slate-900">{insights.manualAdminCount}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2">
          <p className="text-xs font-semibold uppercase text-rose-800">Muddati o‘tgan ACTIVE</p>
          <p className="text-2xl font-bold text-rose-950">{insights.overdueActiveCount}</p>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold text-slate-800">Muddati o‘tgan sessiyalar (worker yoki quyidagi tugma orqali)</p>
        {insights.stuckSessions.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Hozircha mavjud emas.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {insights.stuckSessions.map((s) => (
              <li key={s.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm">
                  <p className="font-medium text-slate-900">
                    {s.participant.firstName} {s.participant.lastName}{" "}
                    <span className="font-normal text-slate-600">({s.participant.gradeLabel})</span>
                  </p>
                  <p className="text-xs text-slate-600">
                    serverEndsAt: {s.serverEndsAt ? new Date(s.serverEndsAt).toLocaleString() : "—"} · lastSeenAt:{" "}
                    {new Date(s.lastSeenAt).toLocaleString()}
                    {s.processingLock ? ` · lock: ${s.processingLock.slice(0, 12)}…` : null}
                  </p>
                </div>
                <form action={manualFinalizeOlympiadSessionFormAction} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="olympiadId" value={olympiadId} />
                  <input type="hidden" name="sessionId" value={s.id} />
                  <input type="hidden" name="revalidatePrefix" value={basePath} />
                  <label className="flex items-center gap-1.5 text-xs text-slate-600">
                    <input type="checkbox" name="forceEvenIfNotOverdue" className="rounded border-slate-300" />
                    Vaqt tugamagan bo‘lsa ham
                  </label>
                  <Button type="submit" variant="secondary" className="px-3 py-2 text-xs">
                    Majburiy yakunlash
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-8 border-t border-slate-200 pt-4">
        <p className="text-sm font-semibold text-slate-800">So‘nggi worker ishga tushirishlari (global)</p>
        <ul className="mt-2 space-y-1 text-xs text-slate-600">
          {insights.recentWorkerRuns.length === 0 ? <li>Hozircha yozuv yo‘q.</li> : null}
          {insights.recentWorkerRuns.map((r) => (
            <li key={r.id}>
              {new Date(r.createdAt).toLocaleString()} — finalized: {String(r.metadata.finalized ?? "—")}, repaired:{" "}
              {String(r.metadata.repaired ?? "—")}, errors: {String(r.metadata.errors ?? "—")}
            </li>
          ))}
        </ul>
      </div>
    </DashboardCard>
  );
}
