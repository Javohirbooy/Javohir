import * as React from "react";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

function formatHms(total: number) {
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/**
 * Large countdown for exam chrome. Sync `totalSeconds` from server periodically.
 * `warnBelowSeconds` default 600 = 10 min warning pulse.
 */
export function TimerBadge({
  totalSeconds,
  warnBelowSeconds = 600,
  criticalBelowSeconds = 60,
  onExpire,
  className,
  size = "lg",
}: {
  totalSeconds: number;
  warnBelowSeconds?: number;
  criticalBelowSeconds?: number;
  onExpire?: () => void;
  className?: string;
  size?: "md" | "lg";
}) {
  const [left, setLeft] = React.useState(totalSeconds);
  const fired = React.useRef(false);

  React.useEffect(() => {
    setLeft(totalSeconds);
    fired.current = false;
  }, [totalSeconds]);

  React.useEffect(() => {
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

  const warn = left > 0 && left <= warnBelowSeconds;
  const critical = left > 0 && left <= criticalBelowSeconds;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-2xl border px-4 py-2 font-mono font-bold tabular-nums transition-all duration-300",
        size === "lg" ? "text-2xl sm:text-3xl" : "text-lg",
        critical
          ? "border-[#EF4444]/50 bg-[#EF4444]/15 text-rose-950 shadow-[0_0_28px_-6px_rgba(239,68,68,0.55)] dark:text-rose-100"
          : warn
            ? "border-[#F59E0B]/60 bg-[#F59E0B]/15 text-amber-950 shadow-[0_0_24px_-6px_rgba(245,158,11,0.45)] dark:text-amber-50"
            : "border-slate-200/80 bg-white/95 text-slate-900 dark:border-slate-600 dark:bg-slate-800/95 dark:text-slate-100",
        warn && !critical && "animate-pulse motion-reduce:animate-none",
        className,
      )}
      role="timer"
      aria-live="polite"
      aria-atomic="true"
    >
      <Clock className={cn("shrink-0 opacity-80", size === "lg" ? "h-7 w-7 sm:h-8 sm:w-8" : "h-5 w-5")} aria-hidden />
      <span>{formatHms(left)}</span>
    </div>
  );
}
