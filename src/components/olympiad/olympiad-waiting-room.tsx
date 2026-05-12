"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { beginOlympiadExam, getOlympiadGateState } from "@/app/actions/olympiad-participant";
import { isOlympiadExamTerminalStatus } from "@/lib/olympiad/exam-state-machine";
import { GlassCard } from "@/components/ui/olympiad";
import { olympiadType } from "@/lib/ui/design-system";
import { cn } from "@/lib/utils";

function formatCountdown(ms: number) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((x) => String(x).padStart(2, "0")).join(":");
}

const R = 52;
const C = 2 * Math.PI * R;

export function OlympiadWaitingRoom() {
  const router = useRouter();
  const ringGradId = useId().replace(/:/g, "");
  const [line, setLine] = useState("Yuklanmoqda…");
  const [leftMs, setLeftMs] = useState<number | null>(null);
  const [totalMs, setTotalMs] = useState<number | null>(null);
  const totalMsRef = useRef<number | null>(null);
  const beginInFlight = useRef(false);

  useEffect(() => {
    const tick = async () => {
      const g = await getOlympiadGateState();
      if (!g.ok) {
        setLine(g.error);
        return;
      }
      const start = new Date(g.startsAt).getTime();
      const now = new Date(g.serverNow).getTime();
      const skew = now - Date.now();
      const remain = start - Date.now() - skew;
      const rem = Math.max(0, remain);
      setLeftMs(rem);
      if (totalMsRef.current == null && rem > 0) {
        const t = Math.max(start - now, 1);
        totalMsRef.current = t;
        setTotalMs(t);
      }

      if (isOlympiadExamTerminalStatus(g.sessionStatus) || g.sessionStatus === "SUBMITTING") {
        router.replace("/olympiada/submitted");
        return;
      }
      if (g.sessionStatus === "ACTIVE") {
        router.replace(`/olympiada/test/${g.sessionId}`);
        return;
      }
      if (g.canTakeExam && g.sessionStatus === "WAITING" && rem <= 0) {
        if (!beginInFlight.current) {
          beginInFlight.current = true;
          try {
            const b = await beginOlympiadExam();
            if (b.ok) {
              router.replace(`/olympiada/test/${b.sessionId}`);
              return;
            }
            setLine(b.error);
          } finally {
            beginInFlight.current = false;
          }
        }
        return;
      }
      if (rem > 0) {
        setLine("Imtihon boshlanishini kuting.");
      } else {
        setLine("Tayyorlanmoqda…");
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 3000);
    const id2 = window.setInterval(() => {
      setLeftMs((prev) => (prev == null ? prev : Math.max(0, prev - 1000)));
    }, 1000);
    return () => {
      clearInterval(id);
      clearInterval(id2);
    };
  }, [router]);

  const ratio = totalMs && leftMs != null && totalMs > 0 ? Math.min(1, Math.max(0, leftMs / totalMs)) : 0;
  const dash = C * (1 - ratio);

  return (
    <GlassCard className="mx-auto max-w-md border-white/25 p-8 text-center shadow-2xl sm:p-10">
      <p className={cn(olympiadType.overline, "text-[#4F7CFF] dark:text-sky-400")}>Kutish xonasi</p>
      <h2 className={cn(olympiadType.h2, "mt-2 text-slate-900 dark:text-white")}>Imtihon boshlanishiga</h2>

      <div className="relative mx-auto mt-8 flex h-40 w-40 items-center justify-center sm:h-44 sm:w-44">
        <svg className="absolute inset-0 -rotate-90" width="160" height="160" viewBox="0 0 120 120" aria-hidden>
          <circle cx="60" cy="60" r={R} fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-200 dark:text-slate-700" />
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke={`url(#${ringGradId})`}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={dash}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
          <defs>
            <linearGradient id={ringGradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4F7CFF" />
              <stop offset="100%" stopColor="#22C55E" />
            </linearGradient>
          </defs>
        </svg>
        <div className="relative text-center">
          {leftMs != null && leftMs > 0 ? (
            <p className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white sm:text-3xl" aria-live="polite">
              {formatCountdown(leftMs)}
            </p>
          ) : (
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">—</p>
          )}
        </div>
      </div>

      <p className="mt-6 text-sm font-medium text-slate-700 dark:text-slate-300">{line}</p>
      <div className="mt-6 space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        <p className="font-medium text-slate-800 dark:text-slate-200">Diqqatni jamlang.</p>
        <p>Tayyor bo‘ling — imtihon boshlanganda avtomatik yo‘naltirilasiz.</p>
      </div>
    </GlassCard>
  );
}
