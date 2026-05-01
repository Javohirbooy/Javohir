"use client";

import { StatCard } from "@/components/ui/stat-card";
import type { LandingStatItemDTO, LandingStatIconKey } from "@/components/home/landing-stats-types";
import type { LucideIcon } from "lucide-react";
import { FileQuestion, GraduationCap, Target, Users } from "lucide-react";

const LANDING_STAT_ICON_MAP: Record<LandingStatIconKey, LucideIcon> = {
  users: Users,
  fileQuestion: FileQuestion,
  target: Target,
  graduationCap: GraduationCap,
};

export function LandingStatsGrid({ items }: { items: LandingStatItemDTO[] }) {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((s) => {
          const Icon = s.icon ? LANDING_STAT_ICON_MAP[s.icon] : undefined;
          return (
            <div key={s.label}>
              <StatCard label={s.label} value={s.value} hint={s.hint} icon={Icon} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
