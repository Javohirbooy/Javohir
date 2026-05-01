import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardCard } from "@/components/dashboard/dashboard-card";

export default async function StudentRankingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/kirish");

  const mine = await prisma.testResult.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 12,
    include: { test: { include: { subject: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">Mening natijalarim</h1>
        <p className="mt-1 text-sm text-slate-600">So‘nggi test ballaringiz.</p>
      </div>

      <DashboardCard>
        <ul className="space-y-2">
          {mine.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/55 px-3 py-2.5 text-sm"
            >
              <span className="min-w-0 truncate text-slate-700">{r.test.title}</span>
              <span className="shrink-0 font-bold text-emerald-700">{Math.round(r.score)}%</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-center text-sm text-slate-600">
          Umumiy reyting:{" "}
          <Link href="/reyting" className="font-semibold text-emerald-700 hover:text-emerald-600">
            /reyting
          </Link>
        </p>
      </DashboardCard>
    </div>
  );
}
