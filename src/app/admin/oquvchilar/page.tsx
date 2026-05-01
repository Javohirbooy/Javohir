import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Badge } from "@/components/ui/badge";

export default async function AdminStudentsListPage() {
  const session = await auth();
  requirePermission(session, "USERS_VIEW_ALL", { redirectTo: "/admin" });

  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      grade: true,
      studentManagedLink: { include: { teacher: { select: { id: true, name: true, email: true } } } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">O‘quvchilar</h1>
          <p className="mt-1 text-sm text-white/60">Barcha o‘quvchi akkauntlari — ro‘yxatdan o‘tish yo‘q, faqat admin/o‘qituvchi yaratadi.</p>
        </div>
        <Link
          href="/admin/oquvchilar/yangi"
          className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-900/40 ring-1 ring-white/20"
        >
          + Yangi o‘quvchi
        </Link>
      </div>

      <DashboardCard className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-white/45">
            <tr>
              <th className="px-4 py-3 font-semibold">ID</th>
              <th className="px-4 py-3 font-semibold">Ism</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Sinf</th>
              <th className="px-4 py-3 font-semibold">Mas’ul o‘qituvchi</th>
              <th className="px-4 py-3 font-semibold">Holat</th>
              <th className="px-4 py-3 font-semibold text-right">Amal</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b border-white/5 text-white/85 hover:bg-white/[0.03]">
                <td className="px-4 py-3 font-mono text-sm text-sky-200">{s.studentNumber ?? "—"}</td>
                <td className="px-4 py-3 font-medium text-white">{s.name}</td>
                <td className="px-4 py-3 text-white/70">{s.email}</td>
                <td className="px-4 py-3 text-white/60">{s.grade?.name ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-white/55">
                  {s.studentManagedLink?.teacher ? (
                    <>
                      {s.studentManagedLink.teacher.name}
                      <br />
                      <span className="text-white/40">{s.studentManagedLink.teacher.email}</span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    className={
                      s.status === "ACTIVE"
                        ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-100"
                        : s.status === "BLOCKED"
                          ? "border-rose-400/30 bg-rose-500/15 text-rose-100"
                          : "border-white/15 bg-white/10 text-white/70"
                    }
                  >
                    {s.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/oquvchilar/${s.id}`}
                    className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
                  >
                    Tahrirlash
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {students.length === 0 ? <p className="py-10 text-center text-sm text-white/50">O‘quvchilar yo‘q.</p> : null}
      </DashboardCard>
    </div>
  );
}
