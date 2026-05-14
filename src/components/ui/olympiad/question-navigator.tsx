import { cn } from "@/lib/utils";

export function QuestionNavigator({
  total,
  currentIndex,
  answers,
  onSelect,
  hidden,
  className,
}: {
  total: number;
  currentIndex: number;
  answers: number[];
  onSelect: (i: number) => void;
  hidden?: boolean;
  className?: string;
}) {
  if (hidden) return null;

  return (
    <nav
      className={cn(
        "min-w-0 overflow-x-hidden rounded-2xl border border-white/20 bg-slate-950/40 p-3 backdrop-blur-md dark:border-slate-600/60 dark:bg-slate-900/60 sm:p-4",
        className,
      )}
      aria-label="Savollar bo‘yicha navigatsiya"
    >
      <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-wider text-white/90 dark:text-slate-200">
        Savollar
      </p>
      <div className="grid max-h-[min(40vh,320px)] grid-cols-5 gap-2 overflow-y-auto overflow-x-hidden pb-1 sm:grid-cols-6 md:grid-cols-5 lg:max-h-[min(70vh,480px)]">
        {Array.from({ length: total }, (_, i) => {
          const answered = (answers[i] ?? -1) >= 0;
          const skipped = !answered && i < currentIndex;
          const current = i === currentIndex;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(i)}
              className={cn(
                "flex h-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border-2 text-sm font-bold outline-none transition-colors duration-200 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:active:scale-100",
                current &&
                  "z-[1] border-[#4F7CFF] bg-[#4F7CFF] text-white shadow-[0_0_20px_-4px_rgba(79,124,255,0.7)] ring-2 ring-[#4F7CFF]/40",
                !current &&
                  answered &&
                  "border-[#22C55E]/80 bg-[#22C55E]/90 text-white hover:brightness-110 dark:border-emerald-500/70 dark:bg-emerald-600/90",
                !current &&
                  skipped &&
                  "border-[#F59E0B]/70 bg-[#F59E0B]/25 text-amber-950 dark:border-amber-500/50 dark:bg-amber-500/20 dark:text-amber-100",
                !current &&
                  !answered &&
                  !skipped &&
                  "border-white/30 bg-white/15 text-white hover:border-white/50 hover:bg-white/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-500",
              )}
              aria-label={`Savol ${i + 1}${answered ? ", javob berilgan" : skipped ? ", o‘tkazilgan" : ""}`}
              aria-current={current ? "step" : undefined}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
