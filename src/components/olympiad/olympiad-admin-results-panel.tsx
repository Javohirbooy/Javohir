import Link from "next/link";
import { listAdminOlympiadResultsTable } from "@/app/actions/olympiad-admin";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { OlympiadResultsNavTabs } from "@/components/olympiad/olympiad-results-nav-tabs";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/olympiad/glass-card";
import { OlympiadDetailedExcelExportButton } from "@/components/olympiad/olympiad-detailed-excel-export-button";
import { OlympiadResultsCsvExportButton } from "@/components/olympiad/olympiad-results-csv-export-button";
import { olympiadResultToPoints } from "@/lib/olympiad/result-points";
import { cn } from "@/lib/utils";
import { olympiadType } from "@/lib/ui/design-system";

const PAGE_SIZE = 25;

function buildQuery(base: Record<string, string | undefined>, patch: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  const merged = { ...base, ...patch };
  for (const [k, v] of Object.entries(merged)) {
    if (v && v.trim()) p.set(k, v.trim());
  }
  return p.toString();
}

export async function OlympiadAdminResultsPanel({
  searchParams,
  resultsHref,
  backHref,
  basePath,
}: {
  searchParams: Record<string, string | undefined>;
  resultsHref: string;
  backHref: string;
  basePath: string;
}) {
  const page = Math.max(1, Math.floor(Number(searchParams.page) || 1));
  const data = await listAdminOlympiadResultsTable({
    olympiadId: searchParams.olympiadId,
    gradeLabel: searchParams.grade,
    school: searchParams.school,
    name: searchParams.q,
    page,
    pageSize: PAGE_SIZE,
  });

  if (!data) {
    return (
      <GlassCard className="border-rose-500/30 bg-rose-950/40 p-6 text-rose-50">
        <p>Natijalarni ko‘rish uchun ruxsat yetarli emas.</p>
      </GlassCard>
    );
  }

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const effectiveOlympiadId =
    searchParams.olympiadId?.trim() ||
    (data.olympiadOptions.length === 1 ? data.olympiadOptions[0]!.id : undefined);
  const qBase: Record<string, string | undefined> = {
    olympiadId: searchParams.olympiadId,
    grade: searchParams.grade,
    school: searchParams.school,
    q: searchParams.q,
  };

  return (
    <div className="space-y-8">
      <OlympiadResultsNavTabs basePath={basePath} active="single" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={backHref} className={cn(olympiadType.caption, "text-emerald-700 hover:text-emerald-600 dark:text-emerald-300")}>
            ← Olimpiadalar
          </Link>
          <h1 className={cn(olympiadType.h1, "mt-2 text-slate-900 dark:text-white")}>Alohida olimpiada natijalari</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Bitta fan / bitta olimpiada. Ko‘p fanli paketlar alohida bo‘limda.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OlympiadDetailedExcelExportButton
            olympiadId={effectiveOlympiadId}
            filters={{
              olympiadId: searchParams.olympiadId,
              gradeLabel: searchParams.grade,
              school: searchParams.school,
              name: searchParams.q,
            }}
          />
          <OlympiadResultsCsvExportButton
            filters={{
              olympiadId: searchParams.olympiadId,
              gradeLabel: searchParams.grade,
              school: searchParams.school,
              name: searchParams.q,
            }}
          />
        </div>
      </div>

      <DashboardCard title="Filtrlar">
        <form method="get" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            Olimpiada
            <select
              name="olympiadId"
              defaultValue={searchParams.olympiadId ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-white/15 dark:bg-slate-950 dark:text-white"
            >
              <option value="">— barchasi —</option>
              {data.olympiadOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            Sinf
            <input
              name="grade"
              defaultValue={searchParams.grade ?? ""}
              placeholder="masalan: 7-sinf"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 dark:border-white/15 dark:bg-slate-950 dark:text-white"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            Maktab
            <input
              name="school"
              defaultValue={searchParams.school ?? ""}
              placeholder="qidiruv"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 dark:border-white/15 dark:bg-slate-950 dark:text-white"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            Talaba ismi
            <input
              name="q"
              defaultValue={searchParams.q ?? ""}
              placeholder="ism yoki familiya"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 dark:border-white/15 dark:bg-slate-950 dark:text-white"
            />
          </label>
          <div className="md:col-span-2 lg:col-span-4 flex flex-wrap gap-2">
            <Button type="submit" variant="secondary">
              Qo‘llash
            </Button>
            <Button href={resultsHref} variant="outline">
              Tozalash
            </Button>
          </div>
        </form>
      </DashboardCard>

      <DashboardCard title={`Natijalar (${data.total})`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-white/10 dark:text-slate-400">
                <th className="py-2 pr-3">Reyting</th>
                <th className="py-2 pr-3">Ball</th>
                <th className="py-2 pr-3">Foiz</th>
                <th className="py-2 pr-3">Talaba</th>
                <th className="py-2 pr-3">Sinf</th>
                <th className="py-2 pr-3">Maktab</th>
                <th className="py-2 pr-3">Olimpiada</th>
                <th className="py-2 pr-3">Vaqt (s)</th>
                <th className="py-2">E&apos;lon</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-slate-600 dark:text-slate-400">
                    Natijalar topilmadi.
                  </td>
                </tr>
              ) : (
                data.rows.map((r) => {
                  const pts = olympiadResultToPoints(r.score, r.maxScore);
                  return (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                    <td className="py-2 pr-3 font-mono">{r.rank ?? "—"}</td>
                    <td className="py-2 pr-3 font-mono">
                      {pts.earnedPoints} / {pts.maxPoints}
                    </td>
                    <td className="py-2 pr-3 font-mono">{pts.percent}%</td>
                    <td className="py-2 pr-3">
                      {r.firstName} {r.lastName}
                    </td>
                    <td className="py-2 pr-3">{r.gradeLabel}</td>
                    <td className="py-2 pr-3">{r.schoolName}</td>
                    <td className="py-2 pr-3 text-xs text-slate-600 dark:text-slate-400">{r.olympiadTitle}</td>
                    <td className="py-2 pr-3 font-mono">{r.timeSpentSec ?? "—"}</td>
                    <td className="py-2">{r.published ? "ha" : "yo‘q"}</td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-slate-600 dark:text-slate-400">
              Sahifa {page} / {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 ? (
                <Button
                  href={`${resultsHref}?${buildQuery(qBase, { page: String(page - 1) })}`}
                  variant="outline"
                  className="text-xs"
                >
                  Oldingi
                </Button>
              ) : null}
              {page < totalPages ? (
                <Button
                  href={`${resultsHref}?${buildQuery(qBase, { page: String(page + 1) })}`}
                  variant="outline"
                  className="text-xs"
                >
                  Keyingi
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </DashboardCard>
    </div>
  );
}
