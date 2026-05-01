"use client";

import Link from "next/link";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { SUBJECT_CATALOG } from "@/lib/subject-catalog";
import { DIFFICULTIES, type Difficulty } from "@/lib/difficulty";
import { difficultyLabel } from "@/lib/difficulty";
import { cn } from "@/lib/utils";

export type TestFilters = {
  q?: string;
  subject?: string;
  grade?: number;
  difficulty?: Difficulty;
};

function buildQuery(f: TestFilters) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.subject) p.set("subject", f.subject);
  if (f.grade != null && !Number.isNaN(f.grade)) p.set("grade", String(f.grade));
  if (f.difficulty) p.set("difficulty", f.difficulty);
  const s = p.toString();
  return s ? `?${s}` : "";
}

function merge(base: TestFilters, patch: Partial<TestFilters>): TestFilters {
  return { ...base, ...patch };
}

function stripDifficulty(f: TestFilters): TestFilters {
  const rest = { ...f };
  delete rest.difficulty;
  return rest;
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition duration-200 sm:text-sm",
        active
          ? "border-emerald-400/60 bg-gradient-to-r from-emerald-600/40 to-teal-600/30 text-white shadow-lg shadow-emerald-500/20 ring-1 ring-white/20"
          : "border-white/15 bg-white/5 text-white/75 hover:border-white/25 hover:bg-white/10 hover:text-white",
      )}
    >
      {children}
    </Link>
  );
}

export function TestFilterBar({
  activeQuery,
  activeSubject,
  activeGrade,
  activeDifficulty,
}: {
  activeQuery?: string | null;
  activeSubject?: string;
  activeGrade?: number | null;
  activeDifficulty?: string | null;
}) {
  const tf = useT();
  const locale = useLocale();
  const base: TestFilters = {
    q: activeQuery?.trim() || undefined,
    subject: activeSubject,
    grade: activeGrade ?? undefined,
    difficulty: (activeDifficulty as Difficulty) || undefined,
  };

  const grades = [1, 5, 9, 11];
  const allClear = !activeQuery && !activeSubject && (activeGrade == null || Number.isNaN(activeGrade as number)) && !activeDifficulty;

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-700/90">{tf("tests.filterSubject")}</p>
        <div className="flex flex-wrap gap-2">
          <Chip href="/testlar" active={allClear}>
            {tf("tests.filterAll")}
          </Chip>
          {SUBJECT_CATALOG.map((s) => {
            const href = `/testlar${buildQuery(merge(base, { subject: s.title }))}`;
            const active = activeSubject === s.title;
            return (
              <Chip key={s.slug} href={href} active={active}>
                {s.title}
              </Chip>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-700/90">{tf("tests.filterGrade")}</p>
        <div className="flex flex-wrap gap-2">
          {grades.map((g) => {
            const href = `/testlar${buildQuery(merge(base, { grade: g }))}`;
            const active = activeGrade === g;
            return (
              <Chip key={g} href={href} active={active}>
                {tf("tests.gradeChip", { grade: g })}
              </Chip>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-700/90">{tf("tests.filterDifficulty")}</p>
        <div className="flex flex-wrap gap-2">
          <Chip href={`/testlar${buildQuery(stripDifficulty(base))}`} active={!activeDifficulty}>
            {tf("tests.filterAllLevels")}
          </Chip>
          {DIFFICULTIES.map((d) => {
            const href = `/testlar${buildQuery(merge(base, { difficulty: d }))}`;
            const active = activeDifficulty === d;
            return (
              <Chip key={d} href={href} active={active}>
                {difficultyLabel(d, locale)}
              </Chip>
            );
          })}
        </div>
      </div>
    </div>
  );
}
