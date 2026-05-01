import { Shield, Sparkles, Users } from "lucide-react";
import { getServerLocale } from "@/lib/i18n/resolve-locale";
import { t } from "@/lib/i18n/t";

export async function LandingTrustStrip() {
  const locale = await getServerLocale();
  const items = [
    { icon: Users, titleKey: "home.trust1Title" as const, bodyKey: "home.trust1Body" as const },
    { icon: Shield, titleKey: "home.trust2Title" as const, bodyKey: "home.trust2Body" as const },
    { icon: Sparkles, titleKey: "home.trust3Title" as const, bodyKey: "home.trust3Body" as const },
  ];

  return (
    <section className="border-y border-emerald-100/80 bg-white/60 py-12 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
          {t(locale, "home.trustEyebrow")}
        </p>
        <h2 className="mt-2 text-center font-display text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">
          {t(locale, "home.trustTitle")}
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {items.map(({ icon: Icon, titleKey, bodyKey }) => (
            <div
              key={titleKey}
              className="rounded-2xl border border-emerald-100/90 bg-white/80 p-6 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800/60"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                <Icon className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="mt-4 font-display text-sm font-bold text-slate-900 dark:text-slate-100">{t(locale, titleKey)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t(locale, bodyKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
