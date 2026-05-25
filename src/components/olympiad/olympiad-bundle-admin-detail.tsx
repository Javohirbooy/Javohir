import Link from "next/link";
import { publishBundleRankingsFormAction } from "@/app/actions/olympiad-bundle-admin";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { OlympiadBundleDetailedExcelExportButton } from "@/components/olympiad/olympiad-bundle-detailed-excel-export-button";
import { OlympiadBundleExportButton } from "@/components/olympiad/olympiad-bundle-export-button";
import { Button } from "@/components/ui/button";
import { isOlympiadExamTerminalStatus } from "@/lib/olympiad/exam-state-machine";

type BundleDetail = NonNullable<
  Awaited<ReturnType<typeof import("@/app/actions/olympiad-bundle-admin").getOlympiadBundleAdminDetail>>
>;

export function OlympiadBundleAdminDetail({
  bundle,
  basePath,
}: {
  bundle: BundleDetail;
  basePath: string;
}) {
  const olympiadBase = basePath.replace(/\/bundle.*$/, "");

  return (
    <div className="space-y-6">
      <Link href={olympiadBase} className="text-sm font-semibold text-emerald-700 hover:underline">
        ← Olimpiadalar
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{bundle.title}</h1>
          <p className="text-sm text-slate-600">
            Kod: {bundle.codeHint ?? "—"} · {bundle.subjects.length} fan · {bundle.isActive ? "faol" : "nofaol"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OlympiadBundleDetailedExcelExportButton bundleId={bundle.id} />
          <OlympiadBundleExportButton bundleId={bundle.id} bundleTitle={bundle.title} />
          <Button href={`${basePath}/natijalar/paket?bundleId=${encodeURIComponent(bundle.id)}`} variant="outline">
            Natijalar jadvali
          </Button>
          <form action={publishBundleRankingsFormAction}>
            <input type="hidden" name="bundleId" value={bundle.id} />
            <Button type="submit" variant="secondary">
              Reytingni yangilash
            </Button>
          </form>
        </div>
      </div>

      <DashboardCard title="Fanlar">
        <ul className="divide-y divide-slate-200 text-sm">
          {bundle.subjects.map((s) => (
            <li key={s.id} className="flex flex-wrap justify-between gap-2 py-3">
              <span>
                {s.orderIndex + 1}. {s.titleOverride ?? s.olympiad.title}
                <span className="block text-xs text-slate-500">
                  {s.durationOverrideMinutes ?? s.olympiad.durationMinutes} daq · holat: {s.olympiad.status}
                </span>
              </span>
              <Link href={`${olympiadBase}/${s.olympiad.id}`} className="text-emerald-700 hover:underline">
                Olimpiada
              </Link>
            </li>
          ))}
        </ul>
      </DashboardCard>

      <DashboardCard title="Ishtirokchilar (so‘nggi 200)">
        <ul className="divide-y divide-slate-200 text-sm">
          {bundle.attempts.length === 0 ? (
            <li className="py-4 text-slate-600">Hali urinish yo‘q.</li>
          ) : (
            bundle.attempts.map((a) => {
              const p = a.bundleParticipant;
              const done = a.sessions.filter((s) => isOlympiadExamTerminalStatus(s.status)).length;
              return (
                <li key={a.id} className="py-3">
                  <p className="font-medium text-slate-900">
                    {p.firstName} {p.lastName} · {p.gradeLabel} · {p.schoolName}
                  </p>
                  <p className="text-xs text-slate-600">
                    Ball: {a.totalScore ?? "—"}/{a.totalMaxScore ?? "—"}
                    {a.overallRank != null ? ` · #${a.overallRank}` : ""}
                    {a.completedAt ? " · yakunlangan" : ` · fanlar: ${done}/${bundle.subjects.length}`}
                  </p>
                </li>
              );
            })
          )}
        </ul>
      </DashboardCard>
    </div>
  );
}
