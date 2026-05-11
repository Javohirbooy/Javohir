"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { beginOlympiadExam, getOlympiadGateState } from "@/app/actions/olympiad-participant";
import { Card } from "@/components/ui/card";

function formatCountdown(ms: number) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((x) => String(x).padStart(2, "0")).join(":");
}

export function OlympiadWaitingRoom() {
  const router = useRouter();
  const [line, setLine] = useState("Yuklanmoqda…");
  const [leftMs, setLeftMs] = useState<number | null>(null);
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
      setLeftMs(Math.max(0, remain));

      if (g.sessionStatus === "SUBMITTED") {
        router.replace("/olympiada/submitted");
        return;
      }
      if (g.sessionStatus === "ACTIVE") {
        router.replace(`/olympiada/test/${g.sessionId}`);
        return;
      }
      if (g.canTakeExam && g.sessionStatus === "WAITING" && remain <= 0) {
        if (!beginInFlight.current) {
          beginInFlight.current = true;
          const b = await beginOlympiadExam();
          beginInFlight.current = false;
          if (b.ok) {
            router.replace(`/olympiada/test/${b.sessionId}`);
            return;
          }
          setLine(b.error);
        }
        return;
      }
      if (remain > 0) {
        setLine("Boshlanish vaqtini kuting.");
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

  return (
    <Card className="border-white/20 bg-white/95 p-6 text-center shadow-2xl">
      <p className="text-sm font-semibold uppercase tracking-widest text-sky-700">Kutish xonasi</p>
      <p className="mt-3 text-slate-800">{line}</p>
      {leftMs != null && leftMs > 0 ? (
        <p className="mt-4 font-mono text-3xl font-bold tabular-nums text-slate-900" aria-live="polite">
          {formatCountdown(leftMs)}
        </p>
      ) : null}
    </Card>
  );
}
