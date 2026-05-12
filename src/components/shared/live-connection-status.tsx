import type { ConnectionState } from "@/lib/realtime/types";
import { cn } from "@/lib/utils";

/** Placeholder for transport wiring — swap with subscribeRealtime in contest/workspace routes. */
export function LiveConnectionStatus() {
  const state = "idle" as ConnectionState;

  const label =
    state === "open"
      ? "Live"
      : state === "connecting" || state === "reconnecting"
        ? "Connecting"
        : state === "error"
          ? "Offline"
          : "Standby";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        state === "open"
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
          : "border-slate-300/80 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300",
      )}
      title="Realtime transport bu yerda ulanadi (SSE / WS)."
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden />
      {label}
    </span>
  );
}
