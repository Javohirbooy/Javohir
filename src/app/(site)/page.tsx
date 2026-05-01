import { HeroSection } from "@/components/home/hero-section";
import { LandingStatsSection } from "@/components/home/landing-stats-section";
import { LandingSubjectsPreview } from "@/components/home/landing-subjects-preview";
import { LandingTestPlatform } from "@/components/home/landing-test-platform";
import { SectionTitle } from "@/components/ui/section-title";
import { Card } from "@/components/ui/card";
import { getServerLocale } from "@/lib/i18n/resolve-locale";
import { t } from "@/lib/i18n/t";
import { Cpu, LineChart, Shield, Users } from "lucide-react";

/** Bosh sahifa statistikasi `unstable_cache` bilan 60s; qolgan segmentlar ham tez-yangilanadi */
export const revalidate = 60;

export default async function HomePage() {
  const locale = await getServerLocale();
  const caps = [
    { icon: Users, titleKey: "home.cap1Title" as const, bodyKey: "home.cap1Body" as const },
    { icon: LineChart, titleKey: "home.cap2Title" as const, bodyKey: "home.cap2Body" as const },
    { icon: Shield, titleKey: "home.cap3Title" as const, bodyKey: "home.cap3Body" as const },
    { icon: Cpu, titleKey: "home.cap4Title" as const, bodyKey: "home.cap4Body" as const },
  ];

  return (
    <>
      <HeroSection />
      <div className="pb-8">
        <LandingStatsSection />
      </div>
      <LandingSubjectsPreview />
      <LandingTestPlatform />

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionTitle
          onDark
          eyebrow={t(locale, "home.platformEyebrow")}
          title={t(locale, "home.platformTitle")}
          subtitle={t(locale, "home.platformSubtitle")}
        />
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {caps.map(({ icon: Icon, titleKey, bodyKey }) => (
            <Card
              key={titleKey}
              className="iq-3d-card border-emerald-100 bg-gradient-to-br from-white to-emerald-50/60 p-8 text-slate-800 hover:border-emerald-300/70"
            >
              <div className="iq-3d-chip flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/15 ring-1 ring-emerald-200">
                <Icon className="h-7 w-7 text-emerald-700" />
              </div>
              <h3 className="mt-6 text-xl font-bold">{t(locale, titleKey)}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{t(locale, bodyKey)}</p>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
