import { DashboardShell } from "@/components/dashboard/dashboard-shell";

const items = [
  { href: "/super-admin", label: "Umumiy ko‘rinish", icon: "layout" as const },
  { href: "/admin", label: "Admin panel", icon: "shield" as const },
  { href: "/admin/foydalanuvchilar", label: "Foydalanuvchilar", icon: "user" as const },
  { href: "/admin/audit", label: "Audit", icon: "scroll" as const },
  { href: "/admin/ruxsatlar", label: "Ruxsatlar", icon: "key" as const },
  { href: "/admin/fanlar", label: "Fanlar", icon: "layers" as const },
  { href: "/admin/testlar", label: "Testlar", icon: "activity" as const },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell title="IQ Monitoring · Super Admin" items={items} accent="from-amber-500 via-orange-600 to-rose-600">
      {children}
    </DashboardShell>
  );
}
