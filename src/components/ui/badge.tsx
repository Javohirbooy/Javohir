import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export function Badge({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800",
        className,
      )}
      {...props}
    />
  );
}
