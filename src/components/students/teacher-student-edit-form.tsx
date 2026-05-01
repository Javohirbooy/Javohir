"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { teacherUpdateStudentFormAction, resetStudentPasswordFormAction, type StudentFormState } from "@/app/actions/student-credentials";
import { DashboardCard } from "@/components/dashboard/dashboard-card";

type GradeOpt = { id: string; name: string };

type StudentRow = {
  id: string;
  email: string;
  name: string;
  status: string;
  gradeId: string | null;
};

export function TeacherStudentEditForm({ student, grades }: { student: StudentRow; grades: GradeOpt[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(teacherUpdateStudentFormAction, null as StudentFormState);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <DashboardCard>
      <form action={formAction} className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="studentId" value={student.id} />
        {state?.ok === false ? (
          <div className="rounded-xl border border-rose-400/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 md:col-span-2">{state.error}</div>
        ) : null}
        {state?.ok ? <div className="text-sm text-emerald-200 md:col-span-2">Saqlandi.</div> : null}
        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Email</span>
          <input
            name="email"
            type="email"
            required
            defaultValue={student.email}
            className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none ring-cyan-500/30 focus:ring-2"
          />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Ism</span>
          <input name="name" required defaultValue={student.name} className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none ring-cyan-500/30 focus:ring-2" />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Sinf</span>
          <select name="gradeId" required defaultValue={student.gradeId ?? ""} className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none ring-cyan-500/30 focus:ring-2">
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Holat</span>
          <select name="status" defaultValue={student.status} className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none ring-cyan-500/30 focus:ring-2">
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={pending} className="rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white hover:bg-white/15 disabled:opacity-50">
            {pending ? "Saqlanmoqda…" : "Saqlash"}
          </button>
        </div>
      </form>
    </DashboardCard>
  );
}

export function TeacherStudentResetPasswordForm({ studentId }: { studentId: string }) {
  const [state, formAction, pending] = useActionState(resetStudentPasswordFormAction, null as StudentFormState);
  return (
    <DashboardCard className="border-violet-400/15">
      <h2 className="text-lg font-bold text-white">Parolni yangilash</h2>
      <form action={formAction} className="mt-4 grid gap-3">
        <input type="hidden" name="studentId" value={studentId} />
        {state?.ok === false ? <p className="text-sm text-rose-200">{state.error}</p> : null}
        {state?.ok ? <p className="text-sm text-emerald-200">Parol yangilandi.</p> : null}
        <input name="password" type="text" required minLength={6} placeholder="Yangi parol" className="rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white" />
        <button type="submit" disabled={pending} className="w-fit rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {pending ? "…" : "Yangilash"}
        </button>
      </form>
    </DashboardCard>
  );
}
