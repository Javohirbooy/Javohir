import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { ClientMiniBar } from "@/components/charts/client-mini-bar";
import { Badge } from "@/components/ui/badge";

export default async function TeacherDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/kirish");

  const classes = await prisma.teacherOnClass.findMany({
    where: { userId: session.user.id },
    include: { grade: true },
  });

  const gradeIds = classes.map((c) => c.gradeId);
  const recent = await prisma.testResult.findMany({
    where: { test: { subject: { gradeId: { in: gradeIds } } } },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    take: 15,
    include: { user: true, test: { include: { subject: { include: { grade: true } } } } },
  });

  const chartData = classes.map((c) => ({
    name: `${c.grade.number}`,
    value: recent.filter((r) => r.test.subject.gradeId === c.gradeId).length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="iq-page-title text-2xl font-bold tracking-tight sm:text-3xl">
          Xush kelibsiz, {session.user.name}
        </h1>
        <p className="mt-1 text-sm text-white/65">O‘z sinflaringiz va so‘nggi test natijalari.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/oqituvchi/fanlar"
          className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_-8px_rgba(139,92,246,0.2)] backdrop-blur-sm transition-all duration-300 hover:scale-[1.03] hover:border-cyan-400/25 hover:bg-white/15 hover:shadow-[0_0_28px_-6px_rgba(34,211,238,0.25)] motion-reduce:hover:scale-100"
        >
          Fanlar
        </Link>
        <Link
          href="/oqituvchi/testlar"
          className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_-8px_rgba(139,92,246,0.2)] backdrop-blur-sm transition-all duration-300 hover:scale-[1.03] hover:border-cyan-400/25 hover:bg-white/15 hover:shadow-[0_0_28px_-6px_rgba(34,211,238,0.25)] motion-reduce:hover:scale-100"
        >
          Testlar
        </Link>
        <Link
          href="/oqituvchi/testlar/yangi"
          className="rounded-2xl bg-gradient-to-r from-blue-600 via-violet-600 to-cyan-400 px-4 py-2.5 text-sm font-bold text-white shadow-[0_0_32px_-4px_rgba(139,92,246,0.5),0_8px_28px_-6px_rgba(34,211,238,0.35)] ring-1 ring-white/25 transition-all duration-300 hover:scale-[1.04] hover:shadow-[0_0_40px_-2px_rgba(34,211,238,0.45)] motion-reduce:hover:scale-100"
        >
          Yangi test
        </Link>
      </div>

      <DashboardCard>
        <h2 className="text-lg font-bold">Biriktirilgan sinflar</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {classes.length === 0 ? (
            <p className="text-sm text-white/60">Hozircha sinf biriktirilmagan (seedda 4 va 5-sinflar).</p>
          ) : (
            classes.map((c) => (
              <Badge key={c.id} className="border-white/20 bg-white/10 text-white">
                {c.grade.name}
              </Badge>
            ))
          )}
        </div>
      </DashboardCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCard>
          <h2 className="text-lg font-bold">Sinf bo‘yicha topshirishlar (demo)</h2>
          <ClientMiniBar data={chartData.length ? chartData : [{ name: "—", value: 0 }]} />
        </DashboardCard>
        <DashboardCard>
          <h2 className="text-lg font-bold">Natijalar (eng yuqori ball birinchi)</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {recent.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                <span className="text-white/85">
                  {r.user.name} · {r.test.subject.title}
                </span>
                <span className="font-bold tabular-nums text-emerald-300">{Math.round(r.score)} ball</span>
              </li>
            ))}
          </ul>
        </DashboardCard>
      </div>

    </div>
  );
}
