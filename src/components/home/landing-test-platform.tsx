"use client";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/providers/locale-provider";
import { CheckCircle2, Layers, Timer } from "lucide-react";
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
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                  {p}
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button href="/testlar" variant="primary" className="rounded-2xl px-6 py-3">
                {tf("home.testPlOpenTests")}
              </Button>
              <Button href="/sinflar" variant="glass" className="rounded-2xl px-6 py-3">
                {tf("home.testPlByGrades")}
              </Button>
            </div>
          </div>

          <div className="iq-scale-in iq-3d-card relative rounded-3xl border border-emerald-200 bg-white/90 p-6 shadow-xl shadow-emerald-900/10 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                <Layers className="h-5 w-5 text-emerald-600" />
                {tf("home.testPlDemoWindow")}
              </div>
              <span className="iq-3d-chip flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs text-emerald-800">
                <Timer className="h-3.5 w-3.5" />
                12:00
              </span>
            </div>
            <div className="mt-5 space-y-3">
              <div className="h-3 w-[75%] rounded-full bg-emerald-100" />
              <div className="grid grid-cols-2 gap-2">
                <div className="iq-3d-chip h-10 rounded-xl bg-emerald-500/20 ring-1 ring-emerald-400/45" />
                <div className="h-10 rounded-xl bg-emerald-50 ring-1 ring-emerald-100" />
                <div className="h-10 rounded-xl bg-emerald-50 ring-1 ring-emerald-100" />
                <div className="h-10 rounded-xl bg-emerald-50 ring-1 ring-emerald-100" />
              </div>
              <div className="mt-6 flex items-center justify-between text-xs text-slate-600">
                <span>{tf("home.testPlProgress")}</span>
                <span>66%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-emerald-100">
                <div className="iq-demo-progress-bar h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
