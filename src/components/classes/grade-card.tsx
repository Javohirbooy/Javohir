import Link from "next/link";
import { cn } from "@/lib/utils";
import { gradeGradient } from "@/lib/grade-styles";
import { ChevronRight, GraduationCap } from "lucide-react";

type Props = {
  number: number;
  name: string;
  colorKey: string;
};

export function GradeCard({ number, name, colorKey }: Props) {
  const g = gradeGradient(colorKey);
  return (
    <Link
      href={`/sinf/${number}`}
      className={cn(
        "group iq-3d-card relative overflow-hidden rounded-3xl border border-white/25 p-7 text-white shadow-2xl ring-1 ring-white/10 transition duration-500 hover:-translate-y-1.5 hover:shadow-[0_24px_80px_-20px_rgba(16,185,129,0.35)]",
        `bg-gradient-to-br ${g.from} ${g.to}`,
        g.ring,
      )}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/15 blur-2xl transition group-hover:bg-white/25" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-slate-950/20 opacity-0 transition group-hover:opacity-100" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="iq-3d-chip flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30 backdrop-blur-sm transition group-hover:scale-105">
            <GraduationCap className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-medium text-white/85">{name}</p>
            <p className="mt-0.5 text-4xl font-black tabular-nums tracking-tight">{number}</p>
          </div>
        </div>
        <span className="iq-3d-chip flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 transition group-hover:translate-x-0.5 group-hover:bg-white/25">
          <ChevronRight className="h-5 w-5" />
        </span>
      </div>
      <p className="relative mt-5 text-sm leading-relaxed text-white/85">Fanlar, testlar va materiallar — sinf bo‘yicha tartibli.</p>
    </Link>
  );
}
