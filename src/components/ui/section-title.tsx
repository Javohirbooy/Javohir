import { cn } from "@/lib/utils";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
  /** Light text for dark / gradient page backgrounds */
  onDark?: boolean;
};

export function SectionTitle({ eyebrow, title, subtitle, className, onDark }: Props) {
  return (
    <div className={cn("mx-auto max-w-2xl text-center", className)}>
      {eyebrow ? (
        <p
          className={cn(
            "mb-2 text-xs font-semibold uppercase tracking-[0.2em]",
            onDark ? "text-emerald-200/90" : "text-emerald-600/90",
          )}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={cn(
          "text-balance text-3xl font-extrabold tracking-tight sm:text-4xl",
          onDark ? "text-white" : "text-slate-900",
        )}
      >
        {title}
      </h2>
      {subtitle ? (
        <p className={cn("mt-3 text-pretty text-base sm:text-lg", onDark ? "text-white/70" : "text-slate-600")}>{subtitle}</p>
      ) : null}
    </div>
  );
}
