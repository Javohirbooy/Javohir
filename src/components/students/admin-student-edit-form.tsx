"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminUpdateStudentFormAction, resetStudentPasswordFormAction, type StudentFormState } from "@/app/actions/student-credentials";
import { DashboardCard } from "@/components/dashboard/dashboard-card";

type GradeOpt = { id: string; name: string };
type TeacherOpt = { id: string; name: string; email: string };

type StudentRow = {
  id: string;
  email: string;
  name: string;
  status: string;
  gradeId: string | null;
  managingTeacherId: string | null;
};

export function AdminStudentEditForm({
  student,
  grades,
  teachers,
}: {
  student: StudentRow;
  grades: GradeOpt[];
  teachers: TeacherOpt[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(adminUpdateStudentFormAction, null as StudentFormState);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <DashboardCard>
      <form action={formAction} className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="studentId" value={student.id} />
        {state?.ok === false ? (
          <div className="rounded-xl border border-rose-400/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 md:col-span-2">
            {state.error}
          </div>
        ) : null}
        {state?.ok ? <div className="text-sm text-emerald-200 md:col-span-2">Saqlandi.</div> : null}
        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Email</span>
          <input
            name="email"
            type="email"
            required
            defaultValue={student.email}
            className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none ring-violet-500/30 focus:ring-2"
          />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Ism</span>
          <input
            name="name"
            required
            defaultValue={student.name}
            className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none ring-violet-500/30 focus:ring-2"
          />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Sinf</span>
          <select
            name="gradeId"
            required
            defaultValue={student.gradeId ?? ""}
            className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none ring-violet-500/30 focus:ring-2"
          >
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Holat</span>
          <select name="status" defaultValue={student.status} className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none ring-violet-500/30 focus:ring-2">
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="BLOCKED">BLOCKED</option>
          </select>
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Mas’ul o‘qituvchi</span>
          <select
            name="managingTeacherId"
            defaultValue={student.managingTeacherId ?? ""}
            className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none ring-violet-500/30 focus:ring-2"
          >
            <option value="">— Yo‘q —</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.email}
              </option>
            ))}
          </select>
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white hover:bg-white/15 disabled:opacity-50"
          >
            {pending ? "Saqlanmoqda…" : "O‘zgarishlarni saqlash"}
          </button>
        </div>
      </form>
    </DashboardCard>
  );
}

export function AdminStudentResetPasswordForm({ studentId }: { studentId: string }) {
  const [state, formAction, pending] = useActionState(resetStudentPasswordFormAction, null as StudentFormState);
  return (
    <DashboardCard className="border-cyan-400/15">
      <h2 className="text-lg font-bold text-white">Parolni tiklash</h2>
      <p className="mt-1 text-sm text-white/50">Yangi vaqtinchalik parol — o‘quvchi keyingi kirishda almashtirishi mumkin.</p>
      <form action={formAction} className="mt-4 grid gap-3 md:grid-cols-2">
        <input type="hidden" name="studentId" value={studentId} />
        {state?.ok === false ? <p className="text-sm text-rose-200 md:col-span-2">{state.error}</p> : null}
        {state?.ok ? <p className="text-sm text-emerald-200 md:col-span-2">Parol yangilandi.</p> : null}
        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Yangi parol</span>
          <input name="password" type="text" required minLength={6} className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white" />
        </label>
        <button type="submit" disabled={pending} className="rounded-xl bg-cyan-600/80 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {pending ? "…" : "Parolni yangilash"}
        </button>
      </form>
    </DashboardCard>
  );
}
