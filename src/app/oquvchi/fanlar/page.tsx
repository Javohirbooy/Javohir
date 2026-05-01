import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Badge } from "@/components/ui/badge";

export default async function StudentSubjectsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/kirish");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { grade: true },
  });
  if (!user?.gradeId || !user.grade) {
    return (
      <DashboardCard>
        <p className="text-sm text-white/65">Sinfingiz biriktirilmagan. Admin bilan bog‘laning.</p>
      </DashboardCard>
    );
  }

  const subjects = await prisma.subject.findMany({
    where: { gradeId: user.gradeId },
    orderBy: [{ order: "asc" }, { title: "asc" }],
    include: { topics: { orderBy: { order: "asc" }, take: 8 }, _count: { select: { tests: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Mening fanlarim</h1>
        <p className="mt-1 text-sm text-white/60">
          {user.grade.name} — o‘qish va testlar uchun fanlar (faqat o‘qish rejimi).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {subjects.map((s) => (
          <DashboardCard key={s.id} className="border-cyan-500/10">
            <div className="flex gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-600/20 text-3xl ring-1 ring-white/15">
                {s.imageEmoji}
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-white">{s.title}</h2>
                <Badge className="mt-2 border-white/15 bg-white/10">{s._count.tests} mavjud test</Badge>
                <p className="mt-2 line-clamp-3 text-sm text-white/55">{s.description}</p>
                {s.topics.length ? (
                  <p className="mt-3 text-xs text-white/40">Mavzular: {s.topics.map((t) => t.title).join(" · ")}</p>
                ) : null}
                <Link
                  href="/oquvchi/test-kod"
                  className="mt-4 inline-flex text-sm font-semibold text-cyan-300 hover:text-cyan-200"
                >
                  Test kodi orqali topshirish →
                </Link>
              </div>
            </div>
          </DashboardCard>
        ))}
      </div>
    </div>
  );
}
