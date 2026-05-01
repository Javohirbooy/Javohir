import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export function DashboardCard({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/45 to-white p-6 shadow-[0_20px_44px_-28px_rgba(15,23,42,0.26),inset_0_1px_0_0_rgba(255,255,255,0.8)] backdrop-blur-[16px] backdrop-saturate-[1.1] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "hover:border-emerald-400/25 hover:shadow-[0_32px_80px_-28px_rgba(34,197,94,0.22),0_0_56px_-12px_rgba(16,185,129,0.18),0_0_40px_-20px_rgba(74,222,128,0.1)]",
        "hover:-translate-y-1 hover:scale-[1.01] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100",
        className,
      )}
      {...props}
    >
      <div
        className="pointer-events-none absolute -left-1/2 top-0 z-0 h-full w-[180%] translate-x-0 skew-x-[-14deg] bg-gradient-to-r from-transparent via-white/[0.07] to-transparent opacity-0 transition-[transform,opacity] duration-700 ease-out group-hover:translate-x-[55%] group-hover:opacity-100 motion-reduce:hidden"
        aria-hidden
      />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
