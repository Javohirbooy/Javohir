import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-gradient-to-r from-emerald-100/80 via-slate-200/60 to-emerald-100/80 bg-[length:200%_100%] dark:from-slate-700 dark:via-slate-600 dark:to-slate-700",
        className,
      )}
      {...props}
    />
  );
}
