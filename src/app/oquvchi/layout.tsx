import { DashboardShell } from "@/components/dashboard/dashboard-shell";

const items = [
  { href: "/oquvchi", label: "Profil", icon: "user" as const },
  { href: "/oquvchi/monitoring-testlar", label: "Monitoring", icon: "layout" as const },
  { href: "/oquvchi/fanlar", label: "Fanlar", icon: "layers" as const },
  { href: "/oquvchi/sinflar", label: "Sinfim", icon: "school" as const },
  { href: "/oquvchi/reyting", label: "Reyting", icon: "trophy" as const },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell title="IQ Monitoring · O‘quvchi" items={items} accent="from-emerald-600 via-green-500 to-teal-400">
      {children}
    </DashboardShell>
  );
}
