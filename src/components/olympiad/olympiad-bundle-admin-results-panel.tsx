import Link from "next/link";
import { listAdminBundleResultsTable } from "@/app/actions/olympiad-bundle-admin";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { OlympiadBundleDetailedExcelExportButton } from "@/components/olympiad/olympiad-bundle-detailed-excel-export-button";
import { OlympiadBundleExportButton } from "@/components/olympiad/olympiad-bundle-export-button";
import { OlympiadResultsNavTabs } from "@/components/olympiad/olympiad-results-nav-tabs";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/olympiad/glass-card";
import { cn } from "@/lib/utils";
import { olympiadType } from "@/lib/ui/design-system";

function bundleSectionDashboardTitle(heading: string, count: number): string {
  if (heading.startsWith("Sinf ")) return `${heading} · ${count} ta`;
  return `${heading} sinfi · ${count} ta`;
}

export async function OlympiadBundleAdminResultsPanel({
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
  const data = await listAdminBundleResultsTable({
    bundleId: searchParams.bundleId,
    gradeLabel: searchParams.grade,
    school: searchParams.school,
    name: searchParams.q,
  });

  if (!data) {
    return (
      <GlassCard className="border-rose-500/30 bg-rose-950/40 p-6 text-rose-50">
        <p>Natijalarni ko‘rish uchun ruxsat yetarli emas.</p>
      </GlassCard>
    );
  }

  const sectionCount = data.sections.length;
  const effectiveBundleId =
    searchParams.bundleId?.trim() ||
    (data.bundleOptions.length === 1 ? data.bundleOptions[0]!.id : undefined);

  const tableHead = (
    <thead>
      <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-white/10">
        <th className="py-2 pr-3">Paket o‘rin</th>
        <th className="py-2 pr-3">Sinf o‘rin</th>
        <th className="py-2 pr-3">Ball</th>
        <th className="py-2 pr-3">Foiz</th>
        <th className="py-2 pr-3">Talaba</th>
        <th className="py-2 pr-3">Sinf (yozuv)</th>
        <th className="py-2 pr-3">Maktab</th>
        <th className="py-2 pr-3">Paket</th>
        <th className="py-2">Fanlar</th>
      </tr>
    </thead>
  );

  return (
    <div className="space-y-8">
      <OlympiadResultsNavTabs basePath={basePath} active="bundle" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={backHref} className={cn(olympiadType.caption, "text-emerald-700 hover:text-emerald-600 dark:text-emerald-300")}>
            ← Olimpiadalar
          </Link>
          <h1 className={cn(olympiadType.h1, "mt-2 text-slate-900 dark:text-white")}>Paket natijalari</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Ko‘p fanli imtihon — umumiy ball va foiz. Natijalar <span className="font-medium text-slate-700 dark:text-slate-300">har sinf uchun alohida blokda</span> ko‘rinadi ({sectionCount} ta guruh, jami{" "}
            {data.total} talaba yozuvlari).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OlympiadBundleDetailedExcelExportButton
            bundleId={effectiveBundleId}
            filters={{
              bundleId: searchParams.bundleId,
              gradeLabel: searchParams.grade,
              school: searchParams.school,
              name: searchParams.q,
            }}
          />
          {effectiveBundleId ? (
            <OlympiadBundleExportButton
              bundleId={effectiveBundleId}
              bundleTitle={data.bundleOptions.find((b) => b.id === effectiveBundleId)?.title ?? "paket"}
            />
          ) : null}
        </div>
      </div>

      <DashboardCard title="Filtrlar">
        <form method="get" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            Paket
            <select
              name="bundleId"
              defaultValue={searchParams.bundleId ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-white/15 dark:bg-slate-950 dark:text-white"
            >
              <option value="">— barchasi —</option>
              {data.bundleOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            Sinf
            <input
              name="grade"
              defaultValue={searchParams.grade ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-white/15 dark:bg-slate-950 dark:text-white"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            Maktab
            <input
              name="school"
              defaultValue={searchParams.school ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-white/15 dark:bg-slate-950 dark:text-white"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            Talaba ismi
            <input
              name="q"
              defaultValue={searchParams.q ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-white/15 dark:bg-slate-950 dark:text-white"
            />
          </label>
          <div className="flex flex-wrap gap-2 md:col-span-2 lg:col-span-4">
            <Button type="submit" variant="secondary">
              Qo‘llash
            </Button>
            <Button href={resultsHref} variant="outline">
              Tozalash
            </Button>
          </div>
        </form>
      </DashboardCard>

      {data.total === 0 ? (
        <DashboardCard title="Natijalar">
          <p className="py-6 text-center text-sm text-slate-600 dark:text-slate-400">Natijalar topilmadi.</p>
        </DashboardCard>
      ) : (
        <div className="space-y-8">
          {data.sections.map((sec, si) => (
            <DashboardCard key={`${sec.heading}-${si}`} title={bundleSectionDashboardTitle(sec.heading, sec.rows.length)}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] border-collapse text-left text-sm">
                  {tableHead}
                  <tbody>
                    {sec.rows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-slate-600 dark:text-slate-400">
                          Bu guruhdagi yozuvlar yo‘q.
                        </td>
                      </tr>
                    ) : (
                      sec.rows.map((r) => (
                        <tr key={r.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                          <td className="py-2 pr-3 font-mono">{r.overallRank != null ? `#${r.overallRank}` : "—"}</td>
                          <td className="py-2 pr-3 font-mono">{r.gradeSectionRank != null ? `#${r.gradeSectionRank}` : "—"}</td>
                          <td className="py-2 pr-3 font-mono">
                            {r.earnedPoints} / {r.maxPoints}
                          </td>
                          <td className="py-2 pr-3 font-mono">{r.percent}%</td>
                          <td className="py-2 pr-3">
                            {r.firstName} {r.lastName}
                          </td>
                          <td className="py-2 pr-3">{r.gradeLabel}</td>
                          <td className="py-2 pr-3">{r.schoolName}</td>
                          <td className="py-2 pr-3">
                            <Link href={`${basePath}/bundle/${r.bundleId}`} className="text-emerald-700 hover:underline dark:text-emerald-400">
                              {r.bundleTitle}
                            </Link>
                          </td>
                          <td className="py-2">
                            {r.completedSubjects}/{r.totalSubjects}
                            {r.completedAt ? "" : " · jarayonda"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </DashboardCard>
          ))}
        </div>
      )}
    </div>
  );
}