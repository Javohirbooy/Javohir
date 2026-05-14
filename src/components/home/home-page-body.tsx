import { HeroSection } from "@/components/home/hero-section";
import { LandingStatsSection } from "@/components/home/landing-stats-section";
import { LandingSubjectsPreview } from "@/components/home/landing-subjects-preview";
import { LandingTestPlatform } from "@/components/home/landing-test-platform";
import { LandingOlympiadSection } from "@/components/home/landing-olympiad-section";
import { LandingTrustStrip } from "@/components/home/landing-trust-strip";
import { SectionTitle } from "@/components/ui/section-title";
import { Card } from "@/components/ui/card";
import { getServerLocale } from "@/lib/i18n/resolve-locale";
import { t } from "@/lib/i18n/t";
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/constants";
import { Cpu, LineChart, Shield, Users } from "lucide-react";

export function HeroOnlyFallback() {
  return (
    <>
      <HeroSection />
      <div className="mx-auto max-w-xl px-4 py-12 text-center text-sm text-slate-600 dark:text-slate-300">
        Sahifa qismini yuklashda texnik xato. Iltimos, brauzerda yangilang yoki birozdan keyin qayta urinib ko‘ring.
      </div>
    </>
  );
}

export async function HomePageBody(props: { skipDbSections?: boolean } = {}) {
  const { skipDbSections = false } = props;
  const locale: AppLocale = await getServerLocale().catch(() => DEFAULT_LOCALE);
  const caps = [
    { icon: Users, titleKey: "home.cap1Title" as const, bodyKey: "home.cap1Body" as const },
    { icon: LineChart, titleKey: "home.cap2Title" as const, bodyKey: "home.cap2Body" as const },
    { icon: Shield, titleKey: "home.cap3Title" as const, bodyKey: "home.cap3Body" as const },
    { icon: Cpu, titleKey: "home.cap4Title" as const, bodyKey: "home.cap4Body" as const },
  ];

  return (
    <>
      <HeroSection />
      <div className="mt-8 pb-14 sm:mt-12 sm:pb-16">
        {skipDbSections ? (
          <div className="mx-auto max-w-3xl rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-6 text-center text-sm font-medium text-amber-950 shadow-sm dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-50">
            Statistika va olimpiada bloki vaqtincha yuklanmadi. Sahifani yangilang yoki keyinroq kiring — asosiy test va kirish funksiyalari odatda ishlaydi.
          </div>
        ) : (
          <LandingStatsSection />
        )}
      </div>
      <LandingTrustStrip />
      <LandingSubjectsPreview />
      <LandingTestPlatform />

      {skipDbSections ? null : <LandingOlympiadSection />}

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
