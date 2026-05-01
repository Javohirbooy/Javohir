import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { adminCreateSubject, adminDeleteSubject, adminUpdateSubject } from "@/app/actions/admin-subjects";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Badge } from "@/components/ui/badge";

export default async function AdminSubjectsPage() {
  const session = await auth();
  requirePermission(session, "SUBJECTS_MANAGE", { redirectTo: "/admin" });

  const [subjects, grades] = await Promise.all([
    prisma.subject.findMany({
      orderBy: [{ grade: { number: "asc" } }, { order: "asc" }, { title: "asc" }],
      include: { grade: true, _count: { select: { tests: true, topics: true } } },
    }),
    prisma.grade.findMany({ orderBy: { number: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Fanlar boshqaruvi</h1>
        <p className="mt-1 max-w-2xl text-sm text-white/60">
          Barcha fanlar, sinf biriktirish, emoji va tartib. Ochiq sahifa{" "}
          <Link href="/fanlar" className="text-cyan-300 underline decoration-white/20 underline-offset-2 hover:text-cyan-200">
            /fanlar
          </Link>{" "}
          marketing katalogi uchun.
        </p>
      </div>

      <DashboardCard className="border-violet-400/15">
        <h2 className="text-lg font-bold text-white">Yangi fan</h2>
        <p className="mt-1 text-sm text-white/55">Sinf tanlang, nom va tavsif kiriting.</p>
        <form action={adminCreateSubject} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <label className="space-y-2 lg:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Sinf</span>
            <select
              name="gradeId"
              required
              className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none ring-violet-500/30 focus:ring-2"
            >
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 lg:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Fan nomi</span>
            <input
              name="title"
              required
              placeholder="Masalan: Algebra"
              className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white placeholder:text-white/35 outline-none ring-violet-500/30 focus:ring-2"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Emoji</span>
            <input
              name="imageEmoji"
              defaultValue="📘"
              className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none ring-violet-500/30 focus:ring-2"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Tartib</span>
            <input
              name="order"
              type="number"
              defaultValue={0}
              className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none ring-violet-500/30 focus:ring-2"
            />
          </label>
          <label className="space-y-2 sm:col-span-2 lg:col-span-6">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Tavsif</span>
            <textarea
              name="description"
              rows={2}
              placeholder="Qisqa izoh, o‘quvchilar va o‘qituvchilar uchun"
              className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white placeholder:text-white/35 outline-none ring-violet-500/30 focus:ring-2"
            />
          </label>
          <div className="sm:col-span-2 lg:col-span-6">
            <button
              type="submit"
              className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-900/40 ring-1 ring-white/20 transition hover:brightness-110"
            >
              Fan qo‘shish
            </button>
          </div>
        </form>
      </DashboardCard>

      <DashboardCard>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Ro‘yxat</h2>
            <p className="mt-1 text-sm text-white/55">{subjects.length} ta fan</p>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {subjects.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-inner shadow-black/20 backdrop-blur-md sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-white/15 to-white/5 text-2xl ring-1 ring-white/15">
                    {s.imageEmoji}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-white">{s.title}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge className="border-white/20 bg-violet-500/20 text-violet-100">{s.grade.name}</Badge>
                      <Badge className="border-white/15 bg-white/10 text-white/80">{s._count.tests} test</Badge>
                      <Badge className="border-white/15 bg-white/10 text-white/80">{s._count.topics} mavzu</Badge>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs text-white/50">{s.description}</p>
                  </div>
                </div>
                <form action={adminDeleteSubject} className="shrink-0">
                  <input type="hidden" name="id" value={s.id} />
                  <button
                    type="submit"
                    className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20"
                  >
                    O‘chirish
                  </button>
                </form>
              </div>

              <form action={adminUpdateSubject} className="mt-5 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-2 lg:grid-cols-6">
                <input type="hidden" name="id" value={s.id} />
                <label className="space-y-1.5 lg:col-span-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Sinf</span>
                  <select
                    name="gradeId"
                    defaultValue={s.gradeId}
                    className="w-full rounded-xl border border-white/12 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none ring-cyan-500/25 focus:ring-2"
                  >
                    {grades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5 lg:col-span-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Nom</span>
                  <input
                    name="title"
                    defaultValue={s.title}
                    className="w-full rounded-xl border border-white/12 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none ring-cyan-500/25 focus:ring-2"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Emoji</span>
                  <input
                    name="imageEmoji"
                    defaultValue={s.imageEmoji}
                    className="w-full rounded-xl border border-white/12 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none ring-cyan-500/25 focus:ring-2"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Tartib</span>
                  <input
                    name="order"
                    type="number"
                    defaultValue={s.order}
                    className="w-full rounded-xl border border-white/12 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none ring-cyan-500/25 focus:ring-2"
                  />
                </label>
                <label className="space-y-1.5 sm:col-span-2 lg:col-span-6">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Tavsif</span>
                  <textarea
                    name="description"
                    rows={2}
                    defaultValue={s.description}
                    className="w-full rounded-xl border border-white/12 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none ring-cyan-500/25 focus:ring-2"
                  />
                </label>
                <div className="sm:col-span-2 lg:col-span-6">
                  <button
                    type="submit"
                    className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    Saqlash
                  </button>
                </div>
              </form>
            </div>
          ))}
        </div>
      </DashboardCard>
    </div>
  );
}
