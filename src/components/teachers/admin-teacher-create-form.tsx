"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { adminCreateTeacherFormAction, type TeacherProvisionState } from "@/app/actions/teacher-provision";
import { DashboardCard } from "@/components/dashboard/dashboard-card";

type GradeOpt = { id: string; name: string };
type SubjectOpt = { id: string; title: string; grade: { id: string; name: string } };

export function AdminTeacherCreateForm({ grades, subjects }: { grades: GradeOpt[]; subjects: SubjectOpt[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(adminCreateTeacherFormAction, null as TeacherProvisionState);
  const [selectedGradeIds, setSelectedGradeIds] = useState<string[]>([]);
  const [gradeQuery, setGradeQuery] = useState("");
  const [subjectQuery, setSubjectQuery] = useState("");

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

  useEffect(() => {
    if (state?.ok) {
      router.push("/admin/ustozlar");
      router.refresh();
    }
  }, [state, router]);

  return (
    <DashboardCard>
      <form action={formAction} className="space-y-6">
        {state?.ok === false ? (
          <div className="rounded-xl border border-rose-400/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{state.error}</div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Email</span>
            <input name="email" type="email" required className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none ring-violet-500/30 focus:ring-2" />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/45">To‘liq ism</span>
            <input name="name" required className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none ring-violet-500/30 focus:ring-2" />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Vaqtinchalik parol</span>
            <input name="password" type="text" required minLength={6} className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none ring-violet-500/30 focus:ring-2" />
          </label>
        </div>

        <div>
          <h2 className="text-sm font-bold text-white">Biriktirilgan sinflar</h2>
          <p className="mt-1 text-xs text-white/45">O‘qituvchi faqat tanlangan sinflar bo‘yicha o‘quvchilarni ko‘radi.</p>
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
                  checked={selectedGradeIds.includes(g.id)}
                  onChange={(e) => toggleGrade(g.id, e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                {g.name}
              </label>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold text-white">Biriktirilgan fanlar</h2>
          <p className="mt-1 text-xs text-white/45">Har bir fan tanlangan sinflardan biriga tegishli bo‘lishi kerak.</p>
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
                <input type="checkbox" name="subjectIds" value={s.id} className="h-4 w-4 shrink-0 rounded" />
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
          className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-900/40 ring-1 ring-white/20 disabled:opacity-50"
        >
          {pending ? "Saqlanmoqda…" : "O‘qituvchini yaratish"}
        </button>
      </form>
    </DashboardCard>
  );
}
