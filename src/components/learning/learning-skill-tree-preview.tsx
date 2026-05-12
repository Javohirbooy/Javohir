"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { eduTypography } from "@/lib/design-system/typography";
import { surfaceClass } from "@/lib/design-system/surfaces";
import { Flame, Sparkles } from "lucide-react";

const nodes = [
  { id: "1", label: "Algebra", state: "done" as const },
  { id: "2", label: "Geometriya", state: "current" as const },
  { id: "3", label: "Kombinatorika", state: "locked" as const },
  { id: "4", label: "Teoriya", state: "locked" as const },
];

export const LearningSkillTreePreview = memo(function LearningSkillTreePreview() {
  return (
    <div className={cn(surfaceClass("learning"), "p-5 sm:p-6")}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className={cn(eduTypography.h4, "text-slate-900 dark:text-slate-50")}>Ko‘nikma daraxti</h2>
          <p className={cn(eduTypography.caption, "mt-1")}>Bosqichlar ketma-ket ochiladi — Duolingo uslubidagi yo‘l.</p>
        </div>
        <Sparkles className="h-8 w-8 text-violet-500" aria-hidden />
      </div>
      <ol className="mt-6 flex flex-col gap-3" aria-label="Ko‘nikma zanjirasi">
        {nodes.map((n, i) => (
          <li key={n.id} className="flex items-center gap-3">
            <span className="text-xs tabular-nums text-slate-400" aria-hidden>
              {String(i + 1).padStart(2, "0")}
            </span>
            <button
              type="button"
              disabled={n.state === "locked"}
              className={cn(
                "flex min-h-[48px] flex-1 items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50",
                n.state === "done" && "border-emerald-300/60 bg-emerald-50/80 text-emerald-900 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-100",
                n.state === "current" && "border-violet-400/70 bg-violet-50/90 text-violet-950 shadow-md dark:border-violet-500/50 dark:bg-violet-950/50 dark:text-violet-50",
                n.state === "locked" && "cursor-not-allowed border-slate-200/80 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-500",
              )}
            >
              {n.label}
              {n.state === "done" ? <span className="text-xs font-bold text-emerald-600 dark:text-emerald-300">✓</span> : null}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
});

export const LearningXpStrip = memo(function LearningXpStrip({ xp = 1240, streak = 7 }: { xp?: number; streak?: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 dark:border-amber-900/40 dark:from-amber-950/50 dark:to-orange-950/40">
      <div className="flex items-center gap-2">
        <Flame className="h-5 w-5 text-orange-500" aria-hidden />
        <span className={cn(eduTypography.body, "font-semibold text-amber-950 dark:text-amber-100")}>
          Seriya: {streak} kun
        </span>
      </div>
      <p className={cn(eduTypography.mono, "text-amber-900/90 dark:text-amber-100/90")}>XP {xp.toLocaleString()}</p>
    </div>
  );
});
