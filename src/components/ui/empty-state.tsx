import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, icon, action, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-200/60 bg-emerald-50/30 px-6 py-10 text-center dark:border-slate-600 dark:bg-slate-800/40",
        className,
      )}
    >
      {icon ? <div className="mb-3 text-emerald-600 dark:text-emerald-400">{icon}</div> : null}
      <p className="font-display text-base font-semibold text-slate-800 dark:text-slate-100">{title}</p>
      {description ? <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-300">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
