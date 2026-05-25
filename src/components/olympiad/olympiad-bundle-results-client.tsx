"use client";

import type { BundleCombinedResult } from "@/lib/olympiad/bundle-types";
import { GlassCard } from "@/components/ui/olympiad/glass-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function OlympiadBundleResultsClient({ data }: { data: BundleCombinedResult }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <GlassCard className="border-white/20 bg-white/95 p-6 dark:bg-slate-900/90 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Yakuniy natija</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{data.bundleTitle}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {data.studentName} · {data.schoolName} · {data.gradeLabel}
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/80">
            <p className="text-xs text-slate-500 dark:text-slate-400">Jami ball</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {data.totalScore} / {data.totalMaxScore}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/80">
            <p className="text-xs text-slate-500 dark:text-slate-400">Foiz</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{data.combinedPercent}%</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/80">
            <p className="text-xs text-slate-500 dark:text-slate-400">Umumiy o‘rin</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {data.overallRank != null ? `#${data.overallRank}` : "—"}
            </p>
          </div>
        </div>
        {(data.classRank != null || data.schoolRank != null) && (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            {data.classRank != null ? `Sinf bo‘yicha: #${data.classRank}` : null}
            {data.classRank != null && data.schoolRank != null ? " · " : null}
            {data.schoolRank != null ? `Maktab bo‘yicha: #${data.schoolRank}` : null}
          </p>
        )}
      </GlassCard>

      <GlassCard className="overflow-hidden border-white/20 bg-white/95 dark:bg-slate-900/90">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">Fanlar bo‘yicha</h2>
        </div>
        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
          {data.subjects.map((s) => (
            <li
              key={s.olympiadId}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
            >
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">{s.title}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {s.score} / {s.maxScore} ball · {s.percent}%
                  {s.rank != null ? ` · #${s.rank}` : ""}
                  {s.medal ? ` · ${s.medal.replace(/[^\p{L}\p{N}\s.-]/gu, "").trim() || s.medal}` : ""}
                </p>
              </div>
              <div
                className={cn(
                  "h-2 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700",
                )}
                aria-hidden
              >
                <div
                  className="h-full rounded-full bg-sky-500"
                  style={{ width: `${Math.min(100, s.percent)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </GlassCard>

      <div className="flex flex-wrap gap-3">
        <Button href="/olympiada/bundle" variant="outline" className="min-h-11">
          Fanlar ro‘yxati
        </Button>
        <Button href="/" variant="secondary" className="min-h-11">
          Bosh sahifa
        </Button>
      </div>
    </div>
  );
}
