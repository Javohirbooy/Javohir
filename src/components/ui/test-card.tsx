"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import { difficultyBadgeClass, difficultyLabel } from "@/lib/difficulty";
import { ArrowRight, ListChecks } from "lucide-react";

export type TestCardModel = {
  id: string;
  title: string;
  difficulty: string;
  questionCount: number;
  gradeNumber: number;
  subjectTitle: string;
};

export function TestCard({ test, className }: { test: TestCardModel; className?: string }) {
  const tf = useT();
  const locale = useLocale();
  return (
    <Link href={`/testlar/${test.id}`} className={cn("group block", className)}>
      <article className="iq-3d-card relative flex h-full flex-col overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/55 to-white shadow-xl shadow-emerald-900/10 backdrop-blur-xl transition duration-300 hover:border-emerald-400/50 hover:shadow-[0_24px_64px_-28px_rgba(34,197,94,0.28)]">
        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-emerald-200 bg-emerald-50 text-[0.65rem] font-semibold uppercase tracking-wider text-emerald-800">
              {tf("tests.gradeChip", { grade: test.gradeNumber })}
            </Badge>
            <Badge className={cn("text-[0.65rem] font-semibold uppercase tracking-wider", difficultyBadgeClass(test.difficulty))}>
              {difficultyLabel(test.difficulty, locale)}
            </Badge>
            <span className="text-xs text-slate-500">{test.subjectTitle}</span>
          </div>
          <h3 className="mt-3 text-lg font-bold leading-snug text-slate-800">{test.title}</h3>
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
            <ListChecks className="h-4 w-4 text-emerald-600/85" aria-hidden />
            <span>{tf("tests.questionCount", { n: test.questionCount })}</span>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-emerald-100 bg-emerald-50/55 px-5 py-3 sm:px-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">{tf("tests.startCta")}</span>
          <span className="iq-3d-chip flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 ring-1 ring-emerald-200 transition group-hover:scale-105">
            <ArrowRight className="h-4 w-4 text-white" />
          </span>
        </div>
      </article>
    </Link>
  );
}
