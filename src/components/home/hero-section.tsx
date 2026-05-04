"use client";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/providers/locale-provider";
import { BRAND } from "@/lib/brand";
import { BarChart3, Brain, Sparkles, Zap } from "lucide-react";
import type { CSSProperties } from "react";

export function HeroSection() {
  const tf = useT();

  const features = [
    { icon: Brain, titleKey: "home.feature1Title" as const, descKey: "home.feature1Desc" as const },
    { icon: BarChart3, titleKey: "home.feature2Title" as const, descKey: "home.feature2Desc" as const },
    { icon: Sparkles, titleKey: "home.feature3Title" as const, descKey: "home.feature3Desc" as const },
  ];

  return (
    <section className="relative overflow-hidden px-4 pb-28 pt-16 sm:px-6 sm:pb-32 sm:pt-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[28rem] w-[min(56rem,140%)] -translate-x-1/2 rounded-full bg-gradient-to-b from-emerald-500/25 via-green-400/15 to-transparent blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl text-center">
        <div
          className="inline-flex max-w-full items-center justify-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-2 text-center text-[0.65rem] font-semibold uppercase leading-snug tracking-[0.12em] text-emerald-800 backdrop-blur-xl sm:px-4 sm:text-xs sm:tracking-[0.22em] iq-anim-fade-up"
          style={{ animationDelay: "0ms" } as CSSProperties}
        >
          <Sparkles className="h-4 w-4 text-emerald-500" aria-hidden />
          {tf("home.heroBadge")}
        </div>

        <h1 className="mt-10 text-balance font-extrabold tracking-tight text-emerald-900 iq-anim-fade-up" style={{ animationDelay: "60ms" } as CSSProperties}>
          <span className="block text-4xl sm:text-6xl lg:text-7xl">
            <span className="bg-gradient-to-r from-emerald-800 via-emerald-600 to-teal-600 bg-clip-text text-transparent">{BRAND.name}</span>
          </span>
          <p className="mt-4 block text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700 sm:text-base">{tf("home.heroKicker")}</p>
        </h1>

        <div
          className="mt-12 flex w-full max-w-xl flex-col items-stretch justify-center gap-3 sm:mx-auto sm:mt-14 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:gap-5 iq-anim-fade-up"
          style={{ animationDelay: "160ms" } as CSSProperties}
        >
          <Button href="/kirish" variant="primary" className="min-h-12 w-full min-w-0 rounded-2xl text-sm font-bold shadow-xl sm:min-h-14 sm:min-w-[12rem] sm:text-base">
            <Zap className="h-5 w-5 shrink-0" />
            {tf("tests.startCta")}
          </Button>
          <Button href="/fanlar" variant="glass" className="min-h-12 w-full min-w-0 rounded-2xl text-sm sm:min-h-14 sm:min-w-[12rem] sm:text-base">
            {tf("nav.subjects")}
          </Button>
          <Button href="/sinflar" variant="outline" className="min-h-12 w-full min-w-0 rounded-2xl text-sm sm:min-h-14 sm:min-w-[12rem] sm:text-base">
            {tf("nav.grades")}
          </Button>
          <Button href="/testlar" variant="outline" className="min-h-12 w-full min-w-0 rounded-2xl text-sm sm:min-h-14 sm:min-w-[12rem] sm:text-base">
            {tf("nav.tests")}
          </Button>
        </div>

        <div className="mx-auto mt-24 grid max-w-4xl grid-cols-1 gap-6 sm:mt-28 sm:grid-cols-3 sm:gap-7 lg:gap-8">
          {features.map(({ icon: Icon, titleKey, descKey }, i) => (
            <div
              key={titleKey}
              className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/55 p-7 text-left text-slate-800 shadow-xl backdrop-blur-xl transition duration-300 hover:border-emerald-300/60 hover:shadow-emerald-500/10 sm:p-8 iq-anim-fade-up"
              style={{ animationDelay: `${280 + i * 70}ms` } as CSSProperties}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/15 ring-1 ring-emerald-200">
                <Icon className="h-5 w-5 text-emerald-700" />
              </div>
              <p className="mt-5 font-semibold">{tf(titleKey)}</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{tf(descKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
