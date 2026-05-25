"use client";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/providers/locale-provider";
import { BarChart3, CheckCircle2, GraduationCap, LineChart } from "lucide-react";
import type { CSSProperties } from "react";

export function LandingTestPlatform() {
  const tf = useT();
  const points = [tf("home.testPlPoint1"), tf("home.testPlPoint2"), tf("home.testPlPoint3")];

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-emerald-200 bg-gradient-to-br from-emerald-50/75 via-emerald-100/55 to-green-100/75 p-8 shadow-2xl shadow-emerald-900/12 backdrop-blur-2xl sm:p-12 lg:p-14">
        <div className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-emerald-400/34 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-green-500/28 blur-3xl" />

        <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-700">{tf("home.testPlEyebrow")}</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-emerald-900 sm:text-4xl">{tf("home.testPlTitle")}</h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-700">{tf("home.testPlBody")}</p>
            <ul className="mt-8 space-y-3">
              {points.map((p, i) => (
                <li
                  key={p}
                  className="iq-stagger-in flex items-center gap-3 text-sm font-medium text-slate-800"
                  style={{ animationDelay: `${i * 75}ms` } as CSSProperties}
                >
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button href="/register" variant="primary" className="rounded-2xl px-6 py-3">
                {tf("footer.register")}
              </Button>
              <Button href="/sinflar" variant="glass" className="rounded-2xl px-6 py-3">
                {tf("home.testPlByGrades")}
              </Button>
            </div>
          </div>

          <div className="iq-scale-in iq-3d-card relative rounded-3xl border border-emerald-200 bg-white/90 p-6 shadow-xl shadow-emerald-900/10 backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{tf("home.testPlDemoWindow")}</p>
            <div className="mt-5 flex items-center gap-3 border-b border-emerald-100 pb-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 ring-1 ring-emerald-200">
                <GraduationCap className="h-6 w-6 text-emerald-700" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-emerald-900">Maktab monitoringi</p>
                <p className="text-xs text-slate-600">Umumiy natija va progress</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
                <LineChart className="h-6 w-6 text-emerald-600" aria-hidden />
                <p className="mt-2 text-xs font-medium text-slate-600">O‘rtacha ball</p>
                <p className="text-lg font-bold text-emerald-800">—</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
                <BarChart3 className="h-6 w-6 text-emerald-600" aria-hidden />
                <p className="mt-2 text-xs font-medium text-slate-600">Topshirilgan</p>
                <p className="text-lg font-bold text-emerald-800">—</p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-slate-500">{tf("home.testPlDemoNote")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
