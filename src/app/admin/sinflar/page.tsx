import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Badge } from "@/components/ui/badge";

export default async function AdminGradesPage() {
  const session = await auth();
  requirePermission(session, "ANALYTICS_GLOBAL", { redirectTo: "/admin" });

  const grades = await prisma.grade.findMany({
    orderBy: { number: "asc" },
    include: { _count: { select: { subjects: true, users: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Sinflar</h1>
        <p className="mt-1 text-sm text-white/60">Har bir sinf uchun fanlar va foydalanuvchilar soni.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {grades.map((g) => (
          <DashboardCard key={g.id} className="border-white/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Sinf</p>
                <h2 className="mt-1 text-xl font-extrabold text-white">{g.name}</h2>
                <p className="mt-1 text-xs text-white/45">Rang kaliti: {g.colorKey}</p>
              </div>
              <span className="rounded-2xl bg-gradient-to-br from-indigo-500/40 to-fuchsia-500/30 px-3 py-1.5 text-sm font-black text-white ring-1 ring-white/20">
                {g.number}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge className="border-white/15 bg-white/10">{g._count.subjects} fan</Badge>
              <Badge className="border-white/15 bg-white/10">{g._count.users} o‘quvchi</Badge>
            </div>
            <Link
              href={`/admin/fanlar`}
              className="mt-4 inline-flex text-sm font-semibold text-cyan-300 hover:text-cyan-200"
            >
              Fanlarni boshqarish →
            </Link>
          </DashboardCard>
        ))}
      </div>
    </div>
  );
}
