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
  /** Oq/yengil sarlavha panelida — `html.dark` bo‘lsa ham yorqin kontrast. */
  appearance = "default",
}: {
  totalSeconds: number;
  warnBelowSeconds?: number;
  criticalBelowSeconds?: number;
  onExpire?: () => void;
  className?: string;
  size?: "md" | "lg";
  appearance?: "default" | "lightToolbar";
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

  const lightToolbarNormal =
    "border-slate-300/90 bg-white text-slate-900 shadow-md shadow-slate-900/10 dark:border-slate-300 dark:bg-white dark:text-slate-900";
  const lightToolbarWarn =
    "border-amber-400/90 bg-amber-50 text-amber-950 shadow-md dark:border-amber-400 dark:bg-amber-50 dark:text-amber-950";
  const lightToolbarCritical =
    "border-rose-500/90 bg-rose-50 text-rose-950 shadow-md dark:border-rose-500 dark:bg-rose-50 dark:text-rose-950";

  const defaultNormal =
    "border-emerald-400/50 bg-emerald-50 text-emerald-950 shadow-md shadow-emerald-900/15 dark:border-emerald-400/50 dark:bg-emerald-950/85 dark:text-emerald-50";
  const defaultWarn =
    "border-[#F59E0B]/70 bg-[#F59E0B]/20 text-amber-950 shadow-[0_0_24px_-6px_rgba(245,158,11,0.45)] dark:border-amber-400/50 dark:bg-amber-950/40 dark:text-amber-50";
  const defaultCritical =
    "border-[#EF4444]/60 bg-[#EF4444]/20 text-rose-950 shadow-[0_0_28px_-6px_rgba(239,68,68,0.55)] dark:border-rose-400/50 dark:bg-rose-950/50 dark:text-rose-50";

  const surface =
    appearance === "lightToolbar"
      ? critical
        ? lightToolbarCritical
        : warn
          ? lightToolbarWarn
          : lightToolbarNormal
      : critical
        ? defaultCritical
        : warn
          ? defaultWarn
          : defaultNormal;

  return (
    <div
      className={cn(
        "flex min-h-[44px] items-center gap-2 rounded-2xl border px-4 py-2 font-mono font-bold tabular-nums shadow-sm transition-[color,background-color,border-color,box-shadow] duration-300 motion-reduce:transition-none",
        size === "lg" ? "text-2xl sm:text-3xl" : "text-lg",
        surface,
        warn && !critical && "animate-pulse motion-reduce:animate-none",
        appearance === "lightToolbar"
          ? "outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          : "outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-emerald-950",
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
