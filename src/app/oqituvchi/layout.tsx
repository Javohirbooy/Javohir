import { DashboardShell } from "@/components/dashboard/dashboard-shell";

const items = [
  { href: "/oqituvchi", label: "Bosh sahifa", icon: "layout" as const },
  { href: "/oqituvchi/sinflar", label: "Sinflarim", icon: "school" as const },
  { href: "/oqituvchi/fanlar", label: "Fanlar", icon: "layers" as const },
  { href: "/oqituvchi/testlar", label: "Testlar", icon: "activity" as const },
  { href: "/oqituvchi/testlar/import", label: "Test import", icon: "scroll" as const },
  { href: "/oqituvchi/oquvchilar", label: "O‘quvchilar", icon: "user" as const },
  { href: "/oqituvchi/reyting", label: "Reyting", icon: "trophy" as const },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell title="IQ Monitoring · O‘qituvchi" items={items} accent="from-emerald-600 via-green-500 to-teal-400">
      {children}
    </DashboardShell>
  );
}
