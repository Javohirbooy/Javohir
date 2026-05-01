import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Badge } from "@/components/ui/badge";

export default async function TeacherSubjectsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/kirish");

  const classes = await prisma.teacherOnClass.findMany({
    where: { userId: session.user.id },
    include: { grade: true },
  });
  const gradeIds = classes.map((c) => c.gradeId);

  const subjects = await prisma.subject.findMany({
    where: { gradeId: { in: gradeIds } },
    orderBy: [{ grade: { number: "asc" } }, { order: "asc" }],
    include: { grade: true, topics: { orderBy: { order: "asc" }, take: 6 }, _count: { select: { tests: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">O‘qituvchi · Fanlar</h1>
          <p className="mt-1 text-sm text-white/60">Biriktirilgan sinflaringiz bo‘yicha fanlar va testlar.</p>
        </div>
        <Link
          href="/oqituvchi/testlar/yangi"
          className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-900/40 ring-1 ring-white/20 transition hover:brightness-110"
        >
          Yangi test
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {subjects.map((s) => (
          <DashboardCard key={s.id} className="border-cyan-400/10">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-white/15 to-white/5 text-3xl ring-1 ring-white/15">
                {s.imageEmoji}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-white">{s.title}</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge className="border-white/20 bg-white/10">{s.grade.name}</Badge>
                  <Badge className="border-white/15 bg-violet-500/20 text-violet-100">{s._count.tests} test</Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-white/55">{s.description}</p>
                {s.topics.length ? (
                  <p className="mt-3 text-xs text-white/40">
                    Mavzular: {s.topics.map((t) => t.title).join(" · ")}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/oqituvchi/testlar/yangi?subjectId=${s.id}`}
                    className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
                  >
                    Test yaratish →
                  </Link>
                  <Link href="/oqituvchi/testlar" className="text-sm font-semibold text-white/50 hover:text-white/80">
                    Barcha testlar
                  </Link>
                </div>
              </div>
            </div>
          </DashboardCard>
        ))}
      </div>

      {subjects.length === 0 ? (
        <DashboardCard>
          <p className="text-sm text-white/60">Sizga sinf biriktirilmagan yoki fanlar yo‘q.</p>
        </DashboardCard>
      ) : null}
    </div>
  );
}
