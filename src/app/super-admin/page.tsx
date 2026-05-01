import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { SuperAdminCredentialsForm } from "@/components/super-admin/super-admin-credentials-form";
import { Shield } from "lucide-react";

export default async function SuperAdminDashboardPage() {
  const session = await auth();
  requirePermission(session, "SITE_SETTINGS_SUPER", { redirectTo: "/" });

  const [userCounts, tests, audit24h] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.test.count(),
    prisma.auditLog.count({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
  ]);

  const byRole = Object.fromEntries(userCounts.map((u) => [u.role, u._count._all])) as Record<string, number>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Super Admin</h1>
          <p className="mt-1 text-sm text-white/60">Tizim bo‘yicha to‘liq nazorat, adminlar va audit.</p>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          <Shield className="h-4 w-4 text-amber-200" aria-hidden />
          Admin panelga o‘tish
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { k: "Super / Admin", v: (byRole.SUPER_ADMIN ?? 0) + (byRole.ADMIN ?? 0) },
          { k: "O‘qituvchilar", v: byRole.TEACHER ?? 0 },
          { k: "O‘quvchilar", v: byRole.STUDENT ?? 0 },
          { k: "Testlar", v: tests },
        ].map((x) => (
          <DashboardCard key={x.k}>
            <p className="text-xs uppercase tracking-widest text-white/50">{x.k}</p>
            <p className="mt-2 text-3xl font-black text-white">{x.v}</p>
          </DashboardCard>
        ))}
      </div>

      <DashboardCard>
        <p className="text-xs uppercase tracking-widest text-white/50">So‘nggi 24 soat</p>
        <p className="mt-2 text-3xl font-black text-amber-200">{audit24h}</p>
        <p className="mt-1 text-sm text-white/55">Audit yozuvlari (kirish va boshqa hodisalar).</p>
        <Link href="/admin/audit" className="mt-4 inline-block text-sm font-semibold text-cyan-300 hover:underline">
          To‘liq jurnal →
        </Link>
      </DashboardCard>

      <DashboardCard>
        <p className="text-sm font-semibold text-slate-700">Super Admin akkaunti</p>
        <p className="mt-1 text-xs text-slate-500">Shu yerda o‘z emailingiz va parolingizni yangilang.</p>
        <SuperAdminCredentialsForm initialEmail={session?.user?.email ?? ""} />
      </DashboardCard>
    </div>
  );
}
