import { RankMedalIcon } from "@/components/ui/rank-medal";
import { cn } from "@/lib/utils";

export function ResultBadge({
  rank,
  className,
  size = "md",
}: {
  rank: number | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  if (rank == null || rank < 1) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
          size === "lg" && "px-4 py-2 text-base",
          className,
        )}
      >
        —
      </span>
    );
  }

  const sizeCls = size === "lg" ? "text-2xl sm:text-3xl" : size === "md" ? "text-lg sm:text-xl" : "text-sm";
  const iconSize = size === "lg" ? "lg" : size === "sm" ? "sm" : "md";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/15 px-4 py-2 font-bold text-slate-900 shadow-lg backdrop-blur-md dark:border-slate-600 dark:bg-slate-800/80 dark:text-white",
        sizeCls,
        className,
      )}
    >
      <RankMedalIcon rank={rank} size={iconSize} />
      <span>#{rank}</span>
    </span>
  );
}
