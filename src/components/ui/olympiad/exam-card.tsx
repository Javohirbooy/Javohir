import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { olympiadCard } from "@/lib/ui/design-system";

/** Primary exam content surface (solid, high contrast for reading). */
export function ExamCard({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        olympiadCard.default,
        "p-4 sm:p-6 lg:p-8",
        // WHY: Modest minimum height reduces vertical jump when switching between short and long questions.
        "min-h-[18rem] sm:min-h-[22rem]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
