import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  className?: string;
};

/**
 * Premium stat tile — glass surface, optional icon (Stripe / Vercel style).
 */
export function StatCard({ label, value, hint, icon: Icon, className }: Props) {
  return (
    <div
      className={cn(
        "group iq-3d-card relative overflow-hidden rounded-3xl border border-emerald-300 bg-gradient-to-br from-emerald-50/80 via-emerald-100/70 to-white p-6 shadow-[0_22px_42px_-26px_rgba(15,23,42,0.26)] backdrop-blur-xl transition duration-300 hover:border-emerald-500/65",
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-emerald-500/34 to-transparent blur-2xl transition group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-emerald-700/85">{label}</p>
          <p className="mt-2 text-4xl font-black tracking-tight text-emerald-900 tabular-nums sm:text-5xl">{value}</p>
          {hint ? <p className="mt-1.5 text-sm font-medium text-slate-600">{hint}</p> : null}
        </div>
        {Icon ? (
          <span className="iq-3d-chip flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
        ) : null}
      </div>
    </div>
  );
}
