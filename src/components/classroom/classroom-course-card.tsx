import { memo } from "react";
import { cn } from "@/lib/utils";
import { eduTypography } from "@/lib/design-system/typography";
import { surfaceClass } from "@/lib/design-system/surfaces";
import { Calendar, FileText } from "lucide-react";

export const ClassroomCourseCard = memo(function ClassroomCourseCard({
  title,
  section,
  dueLabel,
}: {
  title: string;
  section: string;
  dueLabel: string;
}) {
  return (
    <article className={cn(surfaceClass("classroom"), "flex flex-col gap-3 p-5 transition hover:shadow-lg sm:flex-row sm:items-center sm:justify-between")}>
      <div className="min-w-0">
        <h3 className={cn(eduTypography.h4, "truncate text-slate-900 dark:text-slate-50")}>{title}</h3>
        <p className={cn(eduTypography.caption, "mt-1 flex items-center gap-2")}>
          <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {section}
        </p>
      </div>
      <p className={cn(eduTypography.bodySm, "inline-flex items-center gap-2 text-slate-600 dark:text-slate-300")}>
        <Calendar className="h-4 w-4" aria-hidden />
        {dueLabel}
      </p>
    </article>
  );
});

export const ClassroomAssignmentRow = memo(function ClassroomAssignmentRow({
  title,
  status,
  points,
}: {
  title: string;
  status: "draft" | "open" | "closed";
  points: number;
}) {
  const tone =
    status === "open"
      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
      : status === "draft"
        ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
        : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 py-3 last:border-0 dark:border-slate-700/80">
      <div className="min-w-0">
        <p className={cn(eduTypography.body, "font-medium text-slate-900 dark:text-slate-50")}>{title}</p>
        <p className={cn(eduTypography.caption, "mt-0.5")}>{points} ball</p>
      </div>
      <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold capitalize", tone)}>{status}</span>
    </div>
  );
});
