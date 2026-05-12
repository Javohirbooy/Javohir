import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "danger" | "neutral" | "primary";

const toneClass: Record<StatusTone, string> = {
  success: "bg-[#22C55E] shadow-[0_0_0_3px_rgba(34,197,94,0.25)]",
  warning: "bg-[#F59E0B] shadow-[0_0_0_3px_rgba(245,158,11,0.25)]",
  danger: "bg-[#EF4444] shadow-[0_0_0_3px_rgba(239,68,68,0.25)]",
  neutral: "bg-slate-400 dark:bg-slate-500",
  primary: "bg-[#4F7CFF] shadow-[0_0_0_3px_rgba(79,124,255,0.25)]",
};

export function StatusIndicator({
  tone = "neutral",
  pulse,
  className,
  label,
}: {
  tone?: StatusTone;
  pulse?: boolean;
  className?: string;
  /** Visually hidden label for a11y */
  label: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn("h-2.5 w-2.5 shrink-0 rounded-full", toneClass[tone], pulse && "animate-pulse")}
        aria-hidden
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
