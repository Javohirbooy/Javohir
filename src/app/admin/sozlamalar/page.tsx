import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { DashboardCard } from "@/components/dashboard/dashboard-card";

export default async function AdminSiteSettingsPage() {
  const session = await auth();
  requirePermission(session, "SITE_SETTINGS_MANAGE", { redirectTo: "/admin" });

  const settings = await prisma.siteSetting.findMany({ orderBy: { key: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Sayt sozlamalari</h1>
        <p className="mt-1 text-sm text-white/60">Xavfsiz CMS-turidagi kalit-qiymat juftliklari (keyingi bosqichda tahrirlash formasi).</p>
      </div>
      <div className="grid gap-4">
        {settings.length === 0 ? (
          <DashboardCard>
            <p className="text-sm text-white/65">Hozircha yozuv yo‘q. Seed yoki admin forma orqali qo‘shing.</p>
          </DashboardCard>
        ) : (
          settings.map((s) => (
            <DashboardCard key={s.id}>
              <p className="font-mono text-xs text-violet-200/90">{s.key}</p>
              <p className="mt-2 whitespace-pre-wrap break-all text-sm text-white/80">{s.value}</p>
            </DashboardCard>
          ))
        )}
      </div>
    </div>
  );
}
