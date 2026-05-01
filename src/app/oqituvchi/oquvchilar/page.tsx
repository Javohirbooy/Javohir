import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Badge } from "@/components/ui/badge";

export default async function TeacherStudentsListPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/kirish");

  const links = await prisma.teacherStudentLink.findMany({
    where: { teacherUserId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      student: { include: { grade: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Mening o‘quvchilarim</h1>
          <p className="mt-1 text-sm text-white/60">Faqat siz yaratgan yoki sizga biriktirilgan o‘quvchilar.</p>
        </div>
        <Link
          href="/oqituvchi/oquvchilar/yangi"
          className="rounded-2xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/15"
        >
          + Yangi o‘quvchi
        </Link>
      </div>

      <DashboardCard className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-white/45">
            <tr>
              <th className="px-4 py-3 font-semibold">ID</th>
              <th className="px-4 py-3 font-semibold">Ism</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Sinf</th>
              <th className="px-4 py-3 font-semibold">Holat</th>
              <th className="px-4 py-3 font-semibold text-right">Amal</th>
            </tr>
          </thead>
          <tbody>
            {links.map((l) => (
              <tr key={l.id} className="border-b border-white/5 text-white/85 hover:bg-white/[0.03]">
                <td className="px-4 py-3 font-mono text-sm text-sky-200">{l.student.studentNumber ?? "—"}</td>
                <td className="px-4 py-3 font-medium text-white">{l.student.name}</td>
                <td className="px-4 py-3 text-white/70">{l.student.email}</td>
                <td className="px-4 py-3 text-white/60">{l.student.grade?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge
                    className={
                      l.student.status === "ACTIVE"
                        ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-100"
                        : "border-white/15 bg-white/10 text-white/70"
                    }
                  >
                    {l.student.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/oqituvchi/oquvchilar/${l.student.id}`}
                    className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-100 hover:bg-violet-500/20"
                  >
                    Tahrirlash
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {links.length === 0 ? <p className="py-10 text-center text-sm text-white/50">Hozircha biriktirilgan o‘quvchi yo‘q.</p> : null}
      </DashboardCard>
    </div>
  );
}
