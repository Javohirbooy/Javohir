import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardCard } from "@/components/dashboard/dashboard-card";

export default async function TeacherRankingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/kirish");

  const classes = await prisma.teacherOnClass.findMany({
    where: { userId: session.user.id },
    select: { gradeId: true },
  });
  const gradeIds = classes.map((c) => c.gradeId);

  const recent = await prisma.testResult.findMany({
    where: { test: { subject: { gradeId: { in: gradeIds } } } },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: true, test: { include: { subject: { include: { grade: true } } } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">Reyting</h1>
        <p className="mt-1 text-sm text-slate-600">Sizning sinflaringiz bo‘yicha so‘nggi natijalar.</p>
      </div>

      <DashboardCard>
        <ol className="space-y-2">
          {recent.map((r, i) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50/55 px-3 py-2.5 text-sm"
            >
              <span className="font-mono text-slate-500">#{i + 1}</span>
              <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{r.user.name}</span>
              <span className="text-slate-500">{r.test.subject.grade.name}</span>
              <span className="font-bold text-emerald-700">{Math.round(r.score)}%</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-center text-xs text-slate-600">
          Umumiy jamoat:{" "}
          <Link href="/reyting" className="text-emerald-700 hover:text-emerald-600">
            /reyting
          </Link>
        </p>
      </DashboardCard>
    </div>
  );
}
