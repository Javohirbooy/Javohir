import { cn } from "@/lib/utils";

export function OlympiadExamProgressBar({
  value,
  className,
  trackClassName,
  barClassName,
}: {
  value: number;
  className?: string;
  trackClassName?: string;
  barClassName?: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700", trackClassName, className)}
    >
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r from-[#4F7CFF] via-sky-500 to-[#22C55E] transition-[width] duration-500 ease-out motion-reduce:transition-none",
          barClassName,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Alias for design-system naming (`<ProgressBar />` in olympiad folder). */
export const ProgressBar = OlympiadExamProgressBar;
