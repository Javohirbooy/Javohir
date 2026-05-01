"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Icon3D } from "@/components/ui/icon-3d";
import {
  Activity,
  GraduationCap,
  Home,
  KeyRound,
  LayoutDashboard,
  Layers,
  ScrollText,
  Shield,
  Trophy,
  Users,
} from "lucide-react";

const icons = {
  layout: LayoutDashboard,
  school: GraduationCap,
  activity: Activity,
  trophy: Trophy,
  user: Users,
  home: Home,
  layers: Layers,
  shield: Shield,
  scroll: ScrollText,
  key: KeyRound,
} as const;

export type DashboardNavIcon = keyof typeof icons;

export function DashboardSidebarNav({
  items,
}: {
  items: { href: string; label: string; icon: DashboardNavIcon }[];
}) {
  const pathname = usePathname();

  return (
    <nav className="iq-stagger-children flex flex-col gap-2">
      {items.map((it) => {
        const Icon = icons[it.icon];
        const active = pathname === it.href || (it.href !== "/" && pathname.startsWith(`${it.href}/`));
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "group flex min-h-[48px] items-center gap-3.5 rounded-2xl px-3 py-3 font-display text-sm font-medium tracking-tight transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:min-h-0 sm:py-2.5",
              active
                ? "scale-[1.02] bg-gradient-to-r from-emerald-500/24 via-green-500/18 to-teal-500/14 text-emerald-900 shadow-[0_0_28px_-8px_rgba(34,197,94,0.22),0_0_20px_-12px_rgba(16,185,129,0.14)] ring-1 ring-emerald-400/35 motion-reduce:scale-100"
                : "text-slate-600 hover:scale-[1.02] hover:bg-emerald-50/80 hover:text-emerald-700 hover:shadow-[0_0_20px_-12px_rgba(34,197,94,0.14)] motion-reduce:hover:scale-100",
            )}
          >
            <Icon3D icon={Icon} size="md" active={active} />
            <span className="min-w-0 truncate">{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
