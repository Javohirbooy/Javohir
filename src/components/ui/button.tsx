import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ComponentProps } from "react";

const variants = {
  primary:
    "font-display relative overflow-hidden bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400 text-slate-900 shadow-[0_0_22px_rgba(14,165,233,0.45),0_0_46px_-8px_rgba(16,185,129,0.45)] ring-1 ring-emerald-200 before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(110deg,transparent_35%,rgba(255,255,255,0.45)_50%,transparent_65%)] before:opacity-0 before:transition-opacity before:duration-500 after:pointer-events-none after:absolute after:inset-[-2px] after:-z-10 after:rounded-[1.05rem] after:bg-[radial-gradient(circle,rgba(56,189,248,0.45)_0%,rgba(56,189,248,0)_70%)] after:blur-md hover:before:opacity-100 hover:shadow-[0_0_30px_rgba(56,189,248,0.62),0_0_56px_-8px_rgba(16,185,129,0.55)] hover:brightness-110 hover:scale-[1.03] motion-reduce:hover:scale-100",
  glass:
    "border border-emerald-300 bg-white/90 text-slate-900 shadow-[0_0_20px_-10px_rgba(16,185,129,0.36)] backdrop-blur-xl backdrop-saturate-150 hover:border-emerald-500/65 hover:bg-emerald-50 hover:shadow-[0_0_30px_-6px_rgba(16,185,129,0.5)] hover:scale-[1.02] motion-reduce:hover:scale-100",
  outline:
    "border-2 border-emerald-300 bg-white/75 text-slate-900 shadow-[0_0_20px_-10px_rgba(16,185,129,0.35)] backdrop-blur-sm hover:border-emerald-500/65 hover:bg-emerald-50 hover:shadow-[0_0_32px_-8px_rgba(16,185,129,0.55)]",
  secondary:
    "border border-slate-200 bg-slate-100 text-slate-800 shadow-sm hover:bg-slate-200/90 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/15",
  ghost: "text-slate-700 hover:bg-slate-900/5 dark:text-white/85 dark:hover:bg-white/10",
  danger: "bg-rose-600 text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500",
};

type Props = ComponentProps<"button"> & {
  variant?: keyof typeof variants;
  href?: string;
};

export function Button({ className, variant = "primary", href, type = "button", children, ...props }: Props) {
  const cls = cn(
    "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 motion-reduce:hover:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900",
    variants[variant],
    className,
  );

  if (href) {
    return (
      <Link href={href} className={cls}>
        <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
      </Link>
    );
  }

  return (
    <button type={type} className={cls} {...props}>
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </button>
  );
}
