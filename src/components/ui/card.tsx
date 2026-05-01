import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-emerald-100 bg-white p-6 shadow-xl shadow-emerald-900/10 backdrop-blur-xl transition-all duration-300 hover:border-emerald-300/55 hover:shadow-2xl",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<"h3">) {
  return <h3 className={cn("text-lg font-bold tracking-tight text-slate-900", className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("mt-2 text-sm leading-relaxed text-slate-600", className)} {...props} />;
}
