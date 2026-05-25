import { cn } from "@/lib/utils";
import { Award, Medal, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const TOP_RANK_STYLES: Record<
  1 | 2 | 3,
  { Icon: LucideIcon; iconClass: string; ringClass: string }
> = {
  1: {
    Icon: Trophy,
    iconClass: "text-amber-500 dark:text-amber-400",
    ringClass: "ring-amber-400/40 bg-amber-50 dark:bg-amber-950/40",
  },
  2: {
    Icon: Medal,
    iconClass: "text-slate-500 dark:text-slate-300",
    ringClass: "ring-slate-300/50 bg-slate-50 dark:bg-slate-800/80",
  },
  3: {
    Icon: Award,
    iconClass: "text-orange-700 dark:text-orange-400",
    ringClass: "ring-orange-400/35 bg-orange-50 dark:bg-orange-950/35",
  },
};

export function RankMedalIcon({
  rank,
  size = "md",
  className,
}: {
  rank: number | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  if (rank == null || rank < 1 || rank > 3) return null;
  const style = TOP_RANK_STYLES[rank as 1 | 2 | 3];
  const { Icon } = style;
  const box =
    size === "lg" ? "h-14 w-14 rounded-2xl" : size === "sm" ? "h-8 w-8 rounded-lg" : "h-11 w-11 rounded-xl";
  const icon = size === "lg" ? "h-8 w-8" : size === "sm" ? "h-4 w-4" : "h-6 w-6";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center ring-1",
        box,
        style.ringClass,
        className,
      )}
      aria-hidden
    >
      <Icon className={cn(icon, style.iconClass)} />
    </span>
  );
}
