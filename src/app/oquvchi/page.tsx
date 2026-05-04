import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BookOpen, FileQuestion } from "lucide-react";

export default async function StudentDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/kirish");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      grade: true,
      results: { orderBy: { createdAt: "desc" }, take: 8, include: { test: { include: { subject: true } } } },
    },
  });
  if (!user) redirect("/kirish");

  const recommended =
    user.gradeId == null
      ? []
      : await prisma.subject.findMany({
          where: { gradeId: user.gradeId },
          orderBy: { order: "asc" },
          take: 4,
          include: { tests: { take: 1 } },
        });

  const avg =
    user.results.length === 0
      ? 0
      : Math.round(user.results.reduce((a, b) => a + b.score, 0) / user.results.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {user.avatarEmoji ? <span className="mr-2">{user.avatarEmoji}</span> : null}
            Salom, {user.name}
          </h1>
          <p className="mt-1 text-sm text-white/70">Profil, sinf va test natijalari — bitta panelda.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/oquvchi/fanlar" variant="glass" className="px-4 py-2 text-sm">
            Fanlarim
          </Button>
          <Button href="/testlar" variant="primary" className="px-5 py-2 text-sm">
            Testlar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <DashboardCard className="lg:col-span-2">
          <h2 className="font-display text-lg font-semibold tracking-tight">Profil</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-white/55">Email</dt>
              <dd className="font-semibold">{user.email}</dd>
            </div>
            <div>
              <dt className="text-white/55">Sinf</dt>
              <dd className="font-semibold">{user.grade ? user.grade.name : "—"}</dd>
            </div>
            <div>
              <dt className="text-white/55">O‘rtacha ball (demo)</dt>
              <dd className="font-semibold">{avg}%</dd>
            </div>
          </dl>
          <div className="mt-6">
            <p className="text-xs uppercase tracking-widest text-white/55">O‘sish</p>
            <ProgressBar value={avg} className="mt-2" trackClassName="bg-white/10" />
          </div>
        </DashboardCard>
        <DashboardCard>
          <h2 className="font-display text-lg font-semibold tracking-tight">Rag‘bat</h2>
          <p className="mt-3 text-sm text-white/70">Har kuni qisqa test — barqaror natija. Davom eting!</p>
        </DashboardCard>
      </div>

      <DashboardCard>
        <h2 className="font-display text-lg font-semibold tracking-tight">So‘nggi test natijalari</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {user.results.length === 0 ? (
            <li className="list-none p-0">
              <EmptyState
                icon={<FileQuestion className="h-10 w-10" aria-hidden />}
                title="Hali natija yo‘q"
                description="Sinfingizga mos testlarni ro‘yxatdan tanlang va topshirishni boshlang."
                action={
                  <Button href="/testlar" variant="primary" className="px-5 py-2.5 text-sm">
                    Testlar
                  </Button>
                }
              />
            </li>
          ) : (
            user.results.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                <span className="text-white/85">{r.test.title}</span>
                <span className="font-bold text-cyan-300">{Math.round(r.score)}%</span>
              </li>
            ))
          )}
        </ul>
      </DashboardCard>

      <DashboardCard>
        <h2 className="font-display text-lg font-semibold tracking-tight">Tavsiya qilingan mavzular</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {recommended.length === 0 ? (
            <div className="sm:col-span-2">
              <EmptyState
                icon={<BookOpen className="h-10 w-10" aria-hidden />}
                title="Tavsiyalar hozircha yo‘q"
                description="Profilga sinf biriktirilgach, fanlar bo‘yicha tavsiyalar paydo bo‘ladi."
                action={
                  <Button href="/oquvchi/sinflar" variant="glass" className="px-4 py-2 text-sm">
                    Sinfim
                  </Button>
                }
              />
            </div>
          ) : null}
          {recommended.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.05] p-4 backdrop-blur-md transition-all duration-300 hover:border-cyan-400/20 hover:bg-white/[0.08]"
            >
              <p className="text-lg">
                {s.imageEmoji} <span className="font-bold">{s.title}</span>
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-white/60">{s.description}</p>
              <Link className="mt-3 inline-block text-sm font-semibold text-cyan-300 hover:underline" href="/testlar">
                Testlarni ko‘rish →
              </Link>
            </div>
          ))}
        </div>
      </DashboardCard>
    </div>
  );
}
