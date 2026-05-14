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
        "min-w-0 overflow-x-hidden rounded-2xl border border-slate-200/95 bg-white/98 p-3 shadow-lg shadow-slate-900/5 ring-1 ring-emerald-500/10 backdrop-blur-md dark:border-slate-200 dark:bg-slate-50 sm:p-4",
        className,
      )}
      aria-label="Savollar bo‘yicha navigatsiya"
    >
      <p className="mb-3 text-[0.65rem] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-600">Savollar</p>
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
                "flex h-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border-2 text-sm font-bold outline-none transition-colors duration-200 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-reduce:active:scale-100 dark:focus-visible:ring-offset-slate-50",
                current &&
                  "z-[1] border-[#4F7CFF] bg-[#4F7CFF] text-white shadow-[0_0_20px_-4px_rgba(79,124,255,0.55)] ring-2 ring-[#4F7CFF]/35",
                !current &&
                  answered &&
                  "border-emerald-500 bg-emerald-500 text-white hover:brightness-110 dark:border-emerald-600 dark:bg-emerald-600",
                !current &&
                  skipped &&
                  "border-amber-400 bg-amber-100 text-amber-950 hover:bg-amber-50 dark:border-amber-400 dark:bg-amber-100 dark:text-amber-950",
                !current &&
                  !answered &&
                  !skipped &&
                  "border-slate-300 bg-slate-100 text-slate-800 hover:border-emerald-400 hover:bg-emerald-50/80 dark:border-slate-300 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-emerald-50",
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
