import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Badge } from "@/components/ui/badge";

export default async function AdminTeachersListPage() {
  const session = await auth();
  requirePermission(session, "USERS_VIEW_ALL", { redirectTo: "/admin" });

  const teachers = await prisma.user.findMany({
    where: { role: "TEACHER" },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      teacherClasses: { include: { grade: true } },
      teacherSubjects: { include: { subject: { include: { grade: true } } } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">O‘qituvchilar</h1>
          <p className="mt-1 text-sm text-white/60">Sinflar va fanlar — relational biriktirishlar.</p>
        </div>
        <Link
          href="/admin/ustozlar/yangi"
          className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-900/40 ring-1 ring-white/20"
        >
          + Yangi o‘qituvchi
        </Link>
      </div>

      <DashboardCard className="overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-white/45">
            <tr>
              <th className="px-4 py-3 font-semibold">Ism</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Sinflar</th>
              <th className="px-4 py-3 font-semibold">Fanlar</th>
              <th className="px-4 py-3 font-semibold">Holat</th>
              <th className="px-4 py-3 font-semibold text-right">Amal</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t) => (
              <tr key={t.id} className="border-b border-white/5 text-white/85 hover:bg-white/[0.03]">
                <td className="px-4 py-3 font-medium text-white">{t.name}</td>
                <td className="px-4 py-3 text-white/70">{t.email}</td>
                <td className="px-4 py-3 text-xs text-white/55">
                  {t.teacherClasses.map((c) => c.grade.name).join(", ") || "—"}
                </td>
                <td className="max-w-[240px] px-4 py-3 text-xs text-white/55">
                  <span className="line-clamp-2">
                    {t.teacherSubjects.map((a) => `${a.subject.grade.name} · ${a.subject.title}`).join(" · ") || "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    className={
                      t.status === "ACTIVE"
                        ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-100"
                        : t.status === "BLOCKED"
                          ? "border-rose-400/30 bg-rose-500/15 text-rose-100"
                          : "border-white/15 bg-white/10 text-white/70"
                    }
                  >
                    {t.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/ustozlar/${t.id}/tahrirlash`}
                    className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
                  >
                    Tahrirlash
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {teachers.length === 0 ? <p className="py-10 text-center text-sm text-white/50">O‘qituvchilar yo‘q.</p> : null}
      </DashboardCard>
    </div>
  );
}
