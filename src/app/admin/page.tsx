import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { ClientMiniBar } from "@/components/charts/client-mini-bar";
import { ProgressBar } from "@/components/ui/progress-bar";
import { BRAND } from "@/lib/brand";
import { Layers, GraduationCap, Activity, Sparkles } from "lucide-react";

export default async function AdminDashboardPage() {
  const session = await auth();
  requirePermission(session, "ANALYTICS_GLOBAL", { redirectTo: "/" });

  const [users, grades, tests, results] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.grade.count(),
    prisma.test.count(),
    prisma.testResult.count(),
  ]);

  const roleLabels: Record<string, string> = {
    SUPER_ADMIN: "Super adminlar",
    ADMIN: "Adminlar",
    TEACHER: "O‘qituvchilar",
    STUDENT: "O‘quvchilar",
  };

  const chartData = users.map((u) => ({
    name: roleLabels[u.role] ?? u.role,
    value: u._count._all,
  }));

  const totalUsers = users.reduce((a, b) => a + b._count._all, 0);
  const activity =
    tests > 0 ? Math.min(100, Math.round((results / Math.max(1, tests * 2)) * 100)) : results > 0 ? 40 : 12;

  const quick = [
    { href: "/admin/fanlar", label: "Fanlar boshqaruvi", desc: "CRUD, sinf biriktirish, meta", icon: Layers },
    { href: "/admin/sinflar", label: "Sinflar", desc: "Barcha sinflar va ranglar", icon: GraduationCap },
    { href: "/admin/testlar", label: "Testlar", desc: "Platforma testlari", icon: Activity },
    { href: "/", label: "Landing", desc: "Marketing sahifa", icon: Sparkles },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="iq-page-title text-2xl font-bold tracking-tight sm:text-3xl">Boshqaruv paneli</h1>
        <p className="mt-1 text-sm text-white/60">
          {BRAND.name} — sinflar, fanlar, testlar va foydalanuvchilar (demo statistikasi).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { k: "Foydalanuvchilar", v: totalUsers },
          { k: "Sinflar", v: grades },
          { k: "Testlar", v: tests },
          { k: "Natijalar yozuvlari", v: results },
        ].map((x) => (
          <DashboardCard key={x.k} className="relative overflow-hidden">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-violet-500/20 blur-2xl" />
            <p className="text-xs uppercase tracking-widest text-white/50">{x.k}</p>
            <p className="mt-2 text-3xl font-black text-white">{x.v}</p>
          </DashboardCard>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-violet-200/80">Tezkor amallar</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quick.map((q) => (
            <Link key={q.href} href={q.href}>
              <DashboardCard className="group h-full p-5 transition hover:border-violet-400/30">
                <q.icon className="h-8 w-8 text-cyan-300/90 transition group-hover:scale-105" />
                <p className="mt-3 font-semibold text-white">{q.label}</p>
                <p className="mt-1 text-xs text-white/55">{q.desc}</p>
              </DashboardCard>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCard>
          <h2 className="text-lg font-bold text-white">Rollar bo‘yicha taqsimot</h2>
          <p className="mt-1 text-sm text-white/55">Demo ma’lumotlar.</p>
          <div className="mt-4">
            <ClientMiniBar data={chartData} />
          </div>
        </DashboardCard>
        <DashboardCard>
          <h2 className="text-lg font-bold text-white">Faollik ko‘rsatkichi</h2>
          <p className="mt-1 text-sm text-white/55">Testlar va topshirishlar nisbati.</p>
          <p className="mt-6 text-4xl font-black text-cyan-300">{activity}%</p>
          <ProgressBar value={activity} className="mt-4 from-violet-400 to-fuchsia-500" trackClassName="bg-white/10" />
        </DashboardCard>
      </div>

      <DashboardCard>
        <h2 className="text-lg font-bold text-white">Keyingi qadam</h2>
        <p className="mt-2 text-sm text-white/60">
          Admin uchun CRUD formalar, API marshrutlari va kontent moderatsiyasi — mavjud Prisma sxemasi va UI komponentlari ustida quriladi.
        </p>
      </DashboardCard>
    </div>
  );
}
