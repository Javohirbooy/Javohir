import { SUBJECT_CATALOG } from "@/lib/subject-catalog";
import { cn } from "@/lib/utils";
import { BookOpen } from "lucide-react";

/** Maktab interfeysi: emoji o‘rniga barqaror Lucide belgi. */
export function SubjectVisual({
  title,
  emoji: _emoji,
  className,
  iconClassName,
}: {
  title: string;
  emoji?: string | null;
  className?: string;
  iconClassName?: string;
}) {
  const found = SUBJECT_CATALOG.find((s) => s.title.toLowerCase() === title.trim().toLowerCase());
  const iconClass = cn("text-violet-700", iconClassName);

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 via-fuchsia-50 to-cyan-100 ring-1 ring-violet-100/80",
        className,
      )}
      aria-hidden
    >
      {found ? <found.Icon className={iconClass} /> : <BookOpen className={iconClass} />}
    </span>
  );
}
