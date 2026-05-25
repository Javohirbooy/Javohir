"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RankMedalIcon } from "@/components/ui/rank-medal";
import { GlassCard, ResultBadge } from "@/components/ui/olympiad";
import { cn } from "@/lib/utils";
import { olympiadButton, olympiadType } from "@/lib/ui/design-system";

export type OlympiadResultsClientProps = {
  title: string;
  published: boolean;
  result: null | {
    score: number;
    maxScore: number | null;
    rank: number | null;
    certificate: null | {
      verifyPublicId: string;
      pdfUrl: string | null;
      revokedAt: string | null;
    };
    earnedPoints?: number | null;
    percentScore?: number | null;
    answeredCount?: number | null;
    correctCount?: number | null;
    questionCount?: number | null;
    timeSpentSec?: number | null;
    schoolName?: string | null;
    gradeLabel?: string | null;
    perQuestion?: { index: number; text: string; maxPoints: number; earnedPoints: number; correct: boolean }[];
  };
};

function fmtPoints(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/\.?0+$/, "");
}

function formatDuration(sec: number | null | undefined): string {
  if (sec == null || sec < 0) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function useAnimatedScore(target: number, enabled: boolean) {
  const [v, setV] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const start = performance.now();
    const dur = 900;
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - (1 - t) ** 3;
      setV(from + (target - from) * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, enabled]);
  return enabled ? Math.round(v * 10) / 10 : target;
}

export function OlympiadResultsClient({ title, published, result }: OlympiadResultsClientProps) {
  const showScore = published && result;
  const pct = result?.percentScore ?? result?.score ?? 0;
  const displayScore = useAnimatedScore(pct, Boolean(showScore));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className={cn(olympiadType.overline, "text-[#4F7CFF] dark:text-sky-400")}>Natijalar</div>
      <h1 className={cn(olympiadType.h1, "text-slate-900 dark:text-white")}>{title}</h1>

      {!published || !result ? (
        <GlassCard className="border-amber-200/50 bg-amber-50/90 p-6 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-50">
          <p className={cn(olympiadType.body, "text-amber-900/90 dark:text-amber-100")}>
            Natijalar hali e&apos;lon qilinmagan. Organizatorlar tasdiqlagach, ball va reyting shu yerda ko‘rinadi.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-5">
          <GlassCard className="relative overflow-hidden p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#4F7CFF]/20 blur-2xl" />
            <div className="relative flex flex-col items-center text-center">
              {showScore && result?.rank != null && result.rank <= 3 ? (
                <div className="mb-2 flex justify-center">
                  <RankMedalIcon rank={result.rank} size="lg" />
                </div>
              ) : null}
              <p className={olympiadType.caption}>Sizning natijangiz</p>
              <div
                className={cn(
                  "mt-4 bg-gradient-to-br from-[#4F7CFF] to-sky-500 bg-clip-text font-black text-transparent dark:from-sky-300 dark:to-[#4F7CFF]",
                  "text-6xl tabular-nums sm:text-7xl",
                )}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {displayScore}%
              </div>
              {result.earnedPoints != null && result.maxScore != null ? (
                <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Jami ball: {fmtPoints(result.earnedPoints)} / {fmtPoints(result.maxScore)}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Reyting sinf bo‘yicha (masalan, {result.gradeLabel ?? "tanlangan sinf"}) hisoblanadi.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <ResultBadge rank={result.rank} size="lg" />
              </div>
            </div>
          </GlassCard>

          <div className="grid gap-3 sm:grid-cols-2">
            <GlassCard className="p-4 text-center sm:p-5">
              <p className={olympiadType.caption}>Maksimal ball</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{result.maxScore ?? "—"}</p>
            </GlassCard>
            <GlassCard className="p-4 text-center sm:p-5">
              <p className={olympiadType.caption}>Sinf bo‘yicha o‘rin</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{result.rank != null ? `#${result.rank}` : "—"}</p>
            </GlassCard>
            <GlassCard className="p-4 text-center sm:p-5">
              <p className={olympiadType.caption}>Maktab</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{result.schoolName ?? "—"}</p>
            </GlassCard>
            <GlassCard className="p-4 text-center sm:p-5">
              <p className={olympiadType.caption}>To‘g‘ri javoblar</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {result.correctCount != null && result.questionCount != null
                  ? `${result.correctCount} / ${result.questionCount}`
                  : "—"}
              </p>
            </GlassCard>
            <GlassCard className="p-4 text-center sm:p-5">
              <p className={olympiadType.caption}>Javob berilgan</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {result.answeredCount != null && result.questionCount != null
                  ? `${result.answeredCount} / ${result.questionCount}`
                  : "—"}
              </p>
            </GlassCard>
            <GlassCard className="p-4 text-center sm:p-5 sm:col-span-2">
              <p className={olympiadType.caption}>Sarflangan vaqt</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{formatDuration(result.timeSpentSec ?? null)}</p>
            </GlassCard>
          </div>

          {result.perQuestion && result.perQuestion.length > 0 ? (
            <GlassCard className="overflow-x-auto rounded-2xl border border-white/15 p-4 sm:p-5 dark:border-slate-600/50">
              <p className={cn(olympiadType.h3, "mb-3 text-slate-900 dark:text-white")}>Savollar bo‘yicha</p>
              <table className="w-full min-w-[280px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-600 dark:text-slate-300">
                    <th className="py-2 pr-2">#</th>
                    <th className="py-2 pr-2">Savol</th>
                    <th className="py-2 pr-2 text-right">Ball</th>
                  </tr>
                </thead>
                <tbody>
                  {[...result.perQuestion]
                    .sort((a, b) => a.index - b.index)
                    .map((q) => (
                      <tr key={`pq-${q.index}`} className="border-b border-slate-100 last:border-0 dark:border-slate-700/80">
                      <td className="py-2 pr-2 align-top text-slate-500 dark:text-slate-400">{q.index}</td>
                      <td className="py-2 pr-2 align-top text-slate-800 dark:text-slate-100">
                        <span className="line-clamp-3 whitespace-pre-wrap">{q.text}</span>
                      </td>
                      <td className="py-2 align-top text-right font-mono text-slate-900 dark:text-white">
                        <span className={q.correct ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                          {fmtPoints(q.earnedPoints)} / {fmtPoints(q.maxPoints)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </GlassCard>
          ) : null}

          {result.certificate?.revokedAt ? (
            <p className="text-sm text-rose-700 dark:text-rose-400">
              Sertifikat bekor qilingan ({new Date(result.certificate.revokedAt).toLocaleString()}).
            </p>
          ) : result.certificate?.verifyPublicId ? (
            <GlassCard className="space-y-4 p-5 sm:p-6">
              <p className={cn(olympiadType.h3, "text-slate-900 dark:text-white")}>Sertifikat</p>
              {result.certificate.pdfUrl ? (
                <a
                  href={result.certificate.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(olympiadButton.base, olympiadButton.primary, "w-full justify-center sm:inline-flex sm:w-auto")}
                >
                  PDF yuklab olish
                </a>
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-400">PDF hali tayyorlanmoqda; birozdan keyin qayta urinib ko‘ring.</p>
              )}
              <p className={cn(olympiadType.caption, "text-left")}>
                Jamoat tekshiruvi:{" "}
                <Link
                  className="font-mono text-[#4F7CFF] underline underline-offset-2 hover:text-sky-600 dark:text-sky-400"
                  href={`/sertifikatni-tekshirish?id=${encodeURIComponent(result.certificate.verifyPublicId)}`}
                >
                  {result.certificate.verifyPublicId}
                </Link>
              </p>
            </GlassCard>
          ) : (
            <p className={cn(olympiadType.caption, "text-slate-500 dark:text-slate-400")}>
              Sertifikat chiqarilgach, PDF va tekshiruv havolasi shu yerda paydo bo‘ladi.
            </p>
          )}

        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        <Link
          href="/"
          className={cn(
            olympiadButton.base,
            olympiadButton.secondary,
            "inline-flex min-h-[44px] items-center justify-center px-5 py-3",
          )}
        >
          Bosh sahifa
        </Link>
      </div>
    </div>
  );
}
