"use client";

import { memo, useMemo } from "react";
import { useStressStore } from "@/lib/state/stress.store";
import { decideStressLayout } from "@/lib/design-system/stress-decider";
import { eduTypography } from "@/lib/design-system/typography";
import { cn } from "@/lib/utils";

function StressSimulatorPanelInner() {
  const stressScore = useStressStore((s) => s.score);
  const setStressScore = useStressStore((s) => s.setScore);
  const { stressTier } = useMemo(() => decideStressLayout(stressScore), [stressScore]);

  const tierCopy = useMemo(() => {
    if (stressTier === "relaxed") return "Relaxed: to‘liq bezatish va yumshoq animatsiya.";
    if (stressTier === "normal") return "Normal: standart chrome.";
    if (stressTier === "focused") return "Focused: kompakt tartib, kam bezatish.";
    return "Hardcore: minimal animatsiya, maksimal zichlik.";
  }, [stressTier]);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:border-slate-700 dark:bg-slate-900/80">
      <p className={cn(eduTypography.h5, "text-slate-900 dark:text-slate-50")}>Stress simulyatori</p>
      <p className={cn(eduTypography.caption, "mt-1")}>{tierCopy}</p>
      <label className="mt-4 flex flex-col gap-2">
        <span className={cn(eduTypography.bodySm, "font-medium text-slate-700 dark:text-slate-200")}>
          Stress: {stressScore}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={stressScore}
          onChange={(e) => setStressScore(Number(e.target.value))}
          className="w-full accent-sky-600"
        />
      </label>
    </div>
  );
}

export const StressSimulatorPanel = memo(StressSimulatorPanelInner);
