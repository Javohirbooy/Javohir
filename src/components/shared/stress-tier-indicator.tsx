"use client";

import { memo, useMemo } from "react";
import { useStressStore } from "@/lib/state/stress.store";
import { decideStressLayout } from "@/lib/design-system/stress-decider";
import { cn } from "@/lib/utils";
import { eduTypography } from "@/lib/design-system/typography";

function StressTierIndicatorInner({ compact }: { compact?: boolean }) {
  const stressScore = useStressStore((s) => s.score);
  const { stressTier } = useMemo(() => decideStressLayout(stressScore), [stressScore]);

  const label =
    stressTier === "relaxed"
      ? "Relaxed"
      : stressTier === "normal"
        ? "Normal"
        : stressTier === "focused"
          ? "Focused"
          : "Hardcore";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100",
        compact && "text-[11px]",
      )}
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2" aria-hidden>
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
            stressTier === "hardcore" ? "bg-rose-500" : "bg-emerald-500",
          )}
        />
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            stressTier === "hardcore"
              ? "bg-rose-500"
              : stressTier === "focused"
                ? "bg-amber-500"
                : "bg-emerald-500",
          )}
        />
      </span>
      <span className={eduTypography.bodySm}>
        Stress {stressScore} · {label}
      </span>
    </div>
  );
}

export const StressTierIndicator = memo(StressTierIndicatorInner);
