import { DashboardShell } from "@/components/dashboard/dashboard-shell";

const items = [
  { href: "/admin", label: "Statistika", icon: "layout" as const },
  { href: "/admin/foydalanuvchilar", label: "Foydalanuvchilar", icon: "user" as const },
  { href: "/admin/oquvchilar", label: "O‘quvchilar", icon: "user" as const },
  { href: "/admin/ustozlar", label: "O‘qituvchilar", icon: "user" as const },
  { href: "/admin/audit", label: "Audit jurnali", icon: "scroll" as const },
  { href: "/admin/sozlamalar", label: "Sozlamalar", icon: "home" as const },
  { href: "/admin/ruxsatlar", label: "Ruxsatlar", icon: "key" as const },
  { href: "/admin/fanlar", label: "Fanlar", icon: "layers" as const },
  { href: "/admin/sinflar", label: "Sinflar", icon: "school" as const },
  { href: "/admin/testlar", label: "Testlar", icon: "activity" as const },
  { href: "/admin/testlar/import", label: "Test import", icon: "scroll" as const },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell title="IQ Monitoring · Admin" items={items} accent="from-emerald-600 via-green-500 to-teal-400">
      {children}
    </DashboardShell>
  );
}
