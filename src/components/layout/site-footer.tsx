import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { DEFAULT_LOCALE } from "@/lib/i18n/constants";
import { getServerLocale } from "@/lib/i18n/resolve-locale";
import { t } from "@/lib/i18n/t";

export async function SiteFooter() {
  let locale = DEFAULT_LOCALE;
  try {
    locale = await getServerLocale();
  } catch (e) {
    console.error("[site-footer] locale", e);
  }
  const year = new Date().getFullYear();
  return (
    <footer className="relative z-10 mt-auto border-t border-emerald-100 bg-white/85 py-12 text-slate-700 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85 dark:text-slate-300">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="max-w-md">
          <p className="text-lg font-bold tracking-tight text-emerald-800 dark:text-emerald-300">{BRAND.name}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{t(locale, "brand.tagline")}</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium">
          <Link className="text-slate-600 transition hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300" href="/fanlar">
            {t(locale, "footer.subjects")}
          </Link>
          <Link className="text-slate-600 transition hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300" href="/sinflar">
            {t(locale, "footer.grades")}
          </Link>
          <Link className="text-slate-600 transition hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300" href="/kirish">
            {t(locale, "footer.tests")}
          </Link>
          <Link className="text-slate-600 transition hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300" href="/kirish">
            {t(locale, "footer.login")}
          </Link>
          {process.env.NEXT_PUBLIC_ENABLE_REGISTRATION !== "0" ? (
            <Link className="text-slate-600 transition hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300" href="/register">
              {t(locale, "footer.register")}
            </Link>
          ) : null}
          <Link className="text-slate-600 transition hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300" href="/aloqa">
            {t(locale, "footer.contact")}
          </Link>
        </div>
      </div>
      <div className="mx-auto mt-10 flex max-w-6xl flex-col items-center gap-2 px-4 sm:px-6">
        <p className="iq-text-3d text-center text-lg font-extrabold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">IQ MONITORING</p>
        <p className="iq-text-3d-soft text-center text-sm font-bold uppercase tracking-[0.28em] text-emerald-800 dark:text-emerald-400">JAVLIYEV JAVOHIR</p>
      </div>
      <p className="mx-auto mt-6 max-w-6xl px-4 text-center text-xs text-slate-500 dark:text-slate-500 sm:px-6">
        {t(locale, "footer.disclaimer", { year })}
      </p>
    </footer>
  );
}
