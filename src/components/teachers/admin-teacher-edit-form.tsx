"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { adminUpdateTeacherFormAction, type TeacherProvisionState } from "@/app/actions/teacher-provision";
import { DashboardCard } from "@/components/dashboard/dashboard-card";

type GradeOpt = { id: string; name: string };
type SubjectOpt = { id: string; title: string; grade: { id: string; name: string } };

export type TeacherEditRow = {
  id: string;
  email: string;
  name: string;
  status: string;
  gradeIds: string[];
  subjectIds: string[];
};

export function AdminTeacherEditForm({
  teacher,
  grades,
  subjects,
}: {
  teacher: TeacherEditRow;
  grades: GradeOpt[];
  subjects: SubjectOpt[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(adminUpdateTeacherFormAction, null as TeacherProvisionState);
  const [selectedGradeIds, setSelectedGradeIds] = useState<string[]>(teacher.gradeIds);
  const [gradeQuery, setGradeQuery] = useState("");
  const [subjectQuery, setSubjectQuery] = useState("");

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  const gradeSet = new Set(selectedGradeIds);
  const subjectSet = new Set(teacher.subjectIds);

  const visibleGrades = useMemo(() => {
    const q = gradeQuery.trim().toLowerCase();
    if (!q) return grades;
    return grades.filter((g) => g.name.toLowerCase().includes(q));
  }, [gradeQuery, grades]);

  const visibleSubjects = useMemo(() => {
    const q = subjectQuery.trim().toLowerCase();
    return subjects.filter((s) => {
      const gradeAllowed = !selectedGradeIds.length || selectedGradeIds.includes(s.grade.id);
      if (!gradeAllowed) return false;
      if (!q) return true;
      return `${s.grade.name} ${s.title}`.toLowerCase().includes(q);
    });
  }, [selectedGradeIds, subjectQuery, subjects]);

  function toggleGrade(gradeId: string, checked: boolean) {
    setSelectedGradeIds((prev) => (checked ? [...new Set([...prev, gradeId])] : prev.filter((id) => id !== gradeId)));
  }

  return (
    <DashboardCard>
      <form action={formAction} className="space-y-6">
        <input type="hidden" name="teacherId" value={teacher.id} />
        {state?.ok === false ? (
          <div className="rounded-xl border border-rose-400/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{state.error}</div>
        ) : null}
        {state?.ok ? <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">O‘zgarishlar saqlandi.</div> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Email</span>
            <input name="email" type="email" required defaultValue={teacher.email} className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none ring-violet-500/30 focus:ring-2" />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/45">To‘liq ism</span>
            <input name="name" required defaultValue={teacher.name} className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none ring-violet-500/30 focus:ring-2" />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Holat</span>
            <select name="status" defaultValue={teacher.status} className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none ring-violet-500/30 focus:ring-2">
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="BLOCKED">BLOCKED</option>
            </select>
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Yangi parol (ixtiyoriy)</span>
            <input name="newPassword" type="text" minLength={6} placeholder="Bo‘sh qoldiring — parol o‘zgarmaydi" className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none ring-violet-500/30 focus:ring-2" />
          </label>
        </div>

        <div>
          <h2 className="text-sm font-bold text-white">Sinflar</h2>
          <input
            type="text"
            value={gradeQuery}
            onChange={(e) => setGradeQuery(e.target.value)}
            placeholder="Sinfdan qidiring…"
            className="mt-3 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-emerald-500/30 focus:ring-2"
          />
          <div className="mt-3 flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            {visibleGrades.map((g) => (
              <label key={g.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85">
                <input
                  type="checkbox"
                  name="gradeIds"
                  value={g.id}
                  checked={gradeSet.has(g.id)}
                  onChange={(e) => toggleGrade(g.id, e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                {g.name}
              </label>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold text-white">Fanlar</h2>
          <input
            type="text"
            value={subjectQuery}
            onChange={(e) => setSubjectQuery(e.target.value)}
            placeholder="Fandan qidiring…"
            className="mt-3 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-emerald-500/30 focus:ring-2"
          />
          <div className="mt-3 flex max-h-64 flex-wrap gap-2 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            {visibleSubjects.map((s) => (
              <label key={s.id} className="flex max-w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/85">
                <input type="checkbox" name="subjectIds" value={s.id} defaultChecked={subjectSet.has(s.id)} className="h-4 w-4 shrink-0 rounded" />
                <span className="truncate">
                  {s.grade.name} · {s.title}
                </span>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white hover:bg-white/15 disabled:opacity-50"
        >
          {pending ? "Saqlanmoqda…" : "Saqlash"}
        </button>
      </form>
    </DashboardCard>
  );
}
