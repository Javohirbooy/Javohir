"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Timer } from "lucide-react";

function formatMmSs(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Countdown for test session. When `onExpire` is set, it fires once at 0 (server must still validate).
 */
export function TestSessionTimer({
  totalSeconds = 300,
  warnBelowSeconds = 30,
  onExpire,
}: {
  totalSeconds?: number;
  warnBelowSeconds?: number;
  onExpire?: () => void;
}) {
  const [left, setLeft] = useState(totalSeconds);
  const fired = useRef(false);

  useEffect(() => {
    setLeft(totalSeconds);
    fired.current = false;
  }, [totalSeconds]);

  useEffect(() => {
    if (left <= 0) {
      if (!fired.current && onExpire) {
        fired.current = true;
        onExpire();
      }
      return;
    }
    const tid = window.setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => window.clearTimeout(tid);
  }, [left, onExpire]);

  const urgent = left > 0 && left <= warnBelowSeconds;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-2xl border px-3 py-2 font-mono text-sm font-semibold tabular-nums transition-colors",
        urgent
          ? "border-rose-400/50 bg-rose-500/15 text-rose-100 shadow-[0_0_24px_-4px_rgba(244,63,94,0.45)]"
          : "border-white/15 bg-white/10 text-white/90",
      )}
    >
      <Timer className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
      <span>{formatMmSs(left)}</span>
    </div>
  );
}
