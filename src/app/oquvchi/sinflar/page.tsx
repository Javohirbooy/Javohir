import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardCard } from "@/components/dashboard/dashboard-card";

export default async function StudentGradePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/kirish");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { grade: { include: { _count: { select: { subjects: true, users: true } } } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Sinfim</h1>
        <p className="mt-1 text-sm text-white/60">Sizning sinfingiz haqida qisqa ma’lumot.</p>
      </div>

      {user?.grade ? (
        <DashboardCard>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Sinf</p>
          <h2 className="mt-2 text-3xl font-black text-white">{user.grade.name}</h2>
          <p className="mt-2 text-sm text-white/55">
            {user.grade._count.subjects} ta fan · sinfdagi o‘quvchilar: {user.grade._count.users}
          </p>
        </DashboardCard>
      ) : (
        <DashboardCard>
          <p className="text-sm text-white/60">Sinf biriktirilmagan.</p>
        </DashboardCard>
      )}
    </div>
  );
}
