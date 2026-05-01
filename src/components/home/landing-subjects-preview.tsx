import Link from "next/link";
import { SUBJECT_CATALOG } from "@/lib/subject-catalog";
import { SectionTitle } from "@/components/ui/section-title";
import { cn } from "@/lib/utils";
import { getServerLocale } from "@/lib/i18n/resolve-locale";
import { t } from "@/lib/i18n/t";
import { ArrowUpRight } from "lucide-react";

const preview = SUBJECT_CATALOG.slice(0, 8);

export async function LandingSubjectsPreview() {
  const locale = await getServerLocale();

  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <SectionTitle
        onDark
        eyebrow={t(locale, "home.subjectsEyebrow")}
        title={t(locale, "home.subjectsTitle")}
        subtitle={t(locale, "home.subjectsSubtitle")}
      />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {preview.map((s) => (
          <Link
            key={s.slug}
            href={`/testlar?subject=${encodeURIComponent(s.title)}`}
            className={cn(
              "group iq-3d-card relative overflow-hidden rounded-3xl border border-emerald-100 p-5 text-white shadow-xl ring-1 transition duration-300 hover:-translate-y-1 hover:shadow-2xl",
              `bg-gradient-to-br ${s.cardGradient}`,
              s.accent,
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent opacity-80 transition group-hover:opacity-90" />
            <div className="relative flex items-start justify-between gap-2">
              <span className="iq-3d-chip flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/35 backdrop-blur-md transition group-hover:scale-105">
                <s.Icon className="h-6 w-6" aria-hidden />
              </span>
              <ArrowUpRight className="h-5 w-5 shrink-0 text-white/70 transition group-hover:text-white" />
            </div>
            <div className="relative mt-5">
              <h3 className="text-lg font-bold">{s.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-white/80">{s.description}</p>
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-10 flex justify-center">
        <Link
          href="/fanlar"
          className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/15"
        >
          {t(locale, "home.subjectsViewAll")}
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
