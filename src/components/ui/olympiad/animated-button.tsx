import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { olympiadButton } from "@/lib/ui/design-system";

export type OlympiadAnimatedButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function AnimatedButton({
  className,
  variant = "primary",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: OlympiadAnimatedButtonVariant }) {
  return (
    <button type="button" className={cn(olympiadButton.base, olympiadButton[variant], className)} {...props}>
      {children}
    </button>
  );
}
