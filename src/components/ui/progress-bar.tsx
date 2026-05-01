"use client";

import { cn } from "@/lib/utils";

type Props = {
  value: number;
  className?: string;
  trackClassName?: string;
};

export function ProgressBar({ value, className, trackClassName }: Props) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("h-3 w-full overflow-hidden rounded-full bg-slate-200/80", trackClassName)}>
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 shadow-sm transition-[width] duration-500 ease-out motion-reduce:transition-none",
          className,
        )}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}
