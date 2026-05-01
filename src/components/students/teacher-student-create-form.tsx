"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { teacherCreateStudentFormAction, type StudentFormState } from "@/app/actions/student-credentials";
import { DashboardCard } from "@/components/dashboard/dashboard-card";

type ClassOpt = { gradeId: string; gradeName: string };

export function TeacherStudentCreateForm({ classes }: { classes: ClassOpt[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(teacherCreateStudentFormAction, null as StudentFormState);

  useEffect(() => {
    if (state?.ok) {
      router.push("/oqituvchi/oquvchilar");
      router.refresh();
    }
  }, [state, router]);

  if (!classes.length) {
    return (
      <DashboardCard>
        <p className="text-sm text-white/60">Sinf biriktirilmagan.</p>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard>
      <form action={formAction} className="grid gap-4 md:grid-cols-2">
        {state?.ok === false ? (
          <div className="rounded-xl border border-rose-400/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 md:col-span-2">{state.error}</div>
        ) : null}
        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Email</span>
          <input name="email" type="email" required className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none ring-cyan-500/30 focus:ring-2" />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/45">To‘liq ism</span>
          <input name="name" required className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none ring-cyan-500/30 focus:ring-2" />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Vaqtinchalik parol</span>
          <input name="password" type="text" required minLength={6} className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none ring-cyan-500/30 focus:ring-2" />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Sinf</span>
          <select name="gradeId" required className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none ring-cyan-500/30 focus:ring-2">
            {classes.map((c) => (
              <option key={c.gradeId} value={c.gradeId}>
                {c.gradeName}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Holat</span>
          <select name="status" className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none ring-cyan-500/30 focus:ring-2">
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-900/40 ring-1 ring-white/20 disabled:opacity-50"
          >
            {pending ? "Saqlanmoqda…" : "Yaratish va biriktirish"}
          </button>
        </div>
      </form>
    </DashboardCard>
  );
}
