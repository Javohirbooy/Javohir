import Link from "next/link";
import { SUBJECT_CATALOG } from "@/lib/subject-catalog";
import { SectionTitle } from "@/components/ui/section-title";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SubjectsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const qLower = q.toLowerCase();
  const items = q
    ? SUBJECT_CATALOG.filter((s) => `${s.title} ${s.description}`.toLowerCase().includes(qLower))
    : SUBJECT_CATALOG;

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
      <SectionTitle
        onDark
        eyebrow="IQ Monitoring"
        title="Barcha fanlar — bitta platformada"
        subtitle="Har bir fan uchun vizual identifikator, testlar va sinflar bo‘yicha kontent tuzilmasi. Filtrlash va kengaytirish uchun tayyor."
      />
      <form className="mt-8">
        <div className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Fan nomi bo‘yicha qidiruv…"
            className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none ring-emerald-500/30 focus:ring-2"
          />
          {q ? (
            <Link
              href="/fanlar"
              className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              ×
            </Link>
          ) : null}
        </div>
      </form>
      <div className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((s) => (
          <Link
            key={s.slug}
            href={`/testlar?subject=${encodeURIComponent(s.title)}`}
            className={cn(
              "group iq-3d-card relative flex flex-col overflow-hidden rounded-3xl border border-emerald-100 p-6 text-white shadow-2xl ring-1 transition duration-300 hover:-translate-y-1 hover:border-emerald-300/70 hover:shadow-emerald-500/15",
              `bg-gradient-to-br ${s.cardGradient}`,
              s.accent,
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/10 to-transparent opacity-95 transition group-hover:opacity-100" />
            <div className="relative flex items-start justify-between gap-3">
              <span className="iq-3d-chip flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-md transition duration-300 group-hover:scale-105 group-hover:bg-white/20">
                <s.Icon className="h-7 w-7" aria-hidden />
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 transition group-hover:bg-white/20">
                <ArrowUpRight className="h-5 w-5 text-white/90" />
              </span>
            </div>
            <div className="relative mt-6 flex flex-1 flex-col">
              <h2 className="text-xl font-bold tracking-tight">{s.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-white/80">{s.description}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-cyan-200/90">Testlarni ko‘rish →</p>
            </div>
          </Link>
        ))}
      </div>
      {!items.length ? <p className="mt-8 text-sm text-white/65">Qidiruv bo‘yicha fan topilmadi.</p> : null}
    </div>
  );
}
