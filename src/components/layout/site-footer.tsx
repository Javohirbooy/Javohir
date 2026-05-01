import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { getServerLocale } from "@/lib/i18n/resolve-locale";
import { t } from "@/lib/i18n/t";

export async function SiteFooter() {
  const locale = await getServerLocale();
  const year = new Date().getFullYear();
  return (
    <footer className="relative z-10 mt-auto border-t border-emerald-100 bg-white/85 py-12 text-slate-700 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="max-w-md">
          <p className="text-lg font-bold tracking-tight text-emerald-800">{BRAND.name}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{t(locale, "brand.tagline")}</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium">
          <Link className="text-slate-600 transition hover:text-emerald-700" href="/fanlar">
            {t(locale, "footer.subjects")}
          </Link>
          <Link className="text-slate-600 transition hover:text-emerald-700" href="/sinflar">
            {t(locale, "footer.grades")}
          </Link>
          <Link className="text-slate-600 transition hover:text-emerald-700" href="/testlar">
            {t(locale, "footer.tests")}
          </Link>
          <Link className="text-slate-600 transition hover:text-emerald-700" href="/kirish">
            {t(locale, "footer.login")}
          </Link>
        </div>
      </div>
      <div className="mx-auto mt-10 flex max-w-6xl flex-col items-center gap-2 px-4 sm:px-6">
        <p className="iq-text-3d text-center text-lg font-extrabold uppercase tracking-[0.16em] text-emerald-700">IQ MONITORING</p>
        <p className="iq-text-3d-soft text-center text-sm font-bold uppercase tracking-[0.28em] text-emerald-800">JAVLIYEV JAVOHIR</p>
      </div>
      <p className="mx-auto mt-6 max-w-6xl px-4 text-center text-xs text-slate-500 sm:px-6">
        {t(locale, "footer.disclaimer", { year })}
      </p>
    </footer>
  );
}
