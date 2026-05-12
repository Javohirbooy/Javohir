"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
  };
};

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
  const displayScore = useAnimatedScore(result?.score ?? 0, Boolean(showScore));

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
              <p className={olympiadType.caption}>Reyting</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{result.rank != null ? `#${result.rank}` : "—"}</p>
            </GlassCard>
          </div>

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
