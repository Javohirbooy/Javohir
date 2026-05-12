import { ClassroomAssignmentRow, ClassroomCourseCard } from "@/components/classroom/classroom-course-card";
import { cn } from "@/lib/utils";
import { eduTypography } from "@/lib/design-system/typography";
import { surfaceClass } from "@/lib/design-system/surfaces";

export default function ClassroomModePage() {
  return (
    <div className="space-y-6 py-6">
      <p className={cn(eduTypography.body, "text-slate-600 dark:text-slate-300")}>
        Classroom mode: materiallar, topshiriqlar va o‘qituvchi ko‘rinishi — toza kartalar va aniq ierarxiya.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <ClassroomCourseCard title="Diskret matematika — 10-A" section="24 ta material · 6 ta topshiriq" dueLabel="Keyingi: 18 may" />
        <ClassroomCourseCard title="Informatika — poyezd guruh" section="12 ta video · 3 ta quiz" dueLabel="Deadline: 20 may" />
      </div>
      <div className={cn(surfaceClass("classroom"), "p-5")}>
        <h2 className={cn(eduTypography.h4, "text-slate-900 dark:text-slate-50")}>Topshiriqlar</h2>
        <div className="mt-2">
          <ClassroomAssignmentRow title="Graf bo‘yicha uy vazifasi" status="open" points={100} />
          <ClassroomAssignmentRow title="Oraliq nazorat (yopiq)" status="closed" points={200} />
          <ClassroomAssignmentRow title="Laboratoriya — draft" status="draft" points={50} />
        </div>
      </div>
    </div>
  );
}
