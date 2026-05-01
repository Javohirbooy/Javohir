import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { DashboardCard } from "@/components/dashboard/dashboard-card";

const roleUi: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  TEACHER: "O‘qituvchi",
  STUDENT: "O‘quvchi",
};

const statusUi: Record<string, string> = {
  ACTIVE: "Faol",
  INACTIVE: "Nofaol",
  BLOCKED: "Bloklangan",
};

export default async function AdminUsersPage() {
  const session = await auth();
  requirePermission(session, "USERS_VIEW_ALL", { redirectTo: "/admin" });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      locale: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Foydalanuvchilar</h1>
        <p className="mt-1 text-sm text-white/60">Rollar, holat va til (so‘nggi 500 ta yozuv; keyingi bosqichda sahifalash).</p>
      </div>
      <DashboardCard className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-white/45">
            <tr>
              <th className="px-4 py-3 font-semibold">Ism</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Rol</th>
              <th className="px-4 py-3 font-semibold">Holat</th>
              <th className="px-4 py-3 font-semibold">Til</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-white/5 text-white/85 hover:bg-white/[0.03]">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-white/70">{u.email}</td>
                <td className="px-4 py-3">{roleUi[u.role] ?? u.role}</td>
                <td className="px-4 py-3">{statusUi[u.status] ?? u.status}</td>
                <td className="px-4 py-3 uppercase">{u.locale}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DashboardCard>
    </div>
  );
}
