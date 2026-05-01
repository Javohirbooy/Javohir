import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Badge } from "@/components/ui/badge";

export default async function TeacherClassesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/kirish");

  const classes = await prisma.teacherOnClass.findMany({
    where: { userId: session.user.id },
    include: {
      grade: { include: { _count: { select: { subjects: true, users: true } } } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Sinflarim</h1>
        <p className="mt-1 text-sm text-white/60">Biriktirilgan sinflar va ularning fanlari.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {classes.map((c) => (
          <DashboardCard key={c.id}>
            <h2 className="text-xl font-extrabold text-white">{c.grade.name}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge className="border-white/15 bg-white/10">{c.grade._count.subjects} fan</Badge>
              <Badge className="border-white/15 bg-white/10">{c.grade._count.users} o‘quvchi</Badge>
            </div>
          </DashboardCard>
        ))}
      </div>
    </div>
  );
}
