import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { olympiadCard, olympiadMotion } from "@/lib/ui/design-system";

export function GlassCard({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(olympiadCard.glass, olympiadMotion.lift, className)} {...props}>
      {children}
    </div>
  );
}
