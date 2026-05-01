import { prisma } from "@/lib/prisma";
import { GradeCard } from "@/components/classes/grade-card";
import { SectionTitle } from "@/components/ui/section-title";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function ClassesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";

  const grades = await prisma.grade.findMany({
    where:
      q.length > 0
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              ...(Number.isFinite(Number(q)) ? [{ number: Number(q) }] : []),
            ],
          }
        : undefined,
    orderBy: { number: "asc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
      <SectionTitle
        onDark
        eyebrow="Sinf tuzilmasi"
        title="1–11 sinf: har biri alohida monitoring"
        subtitle="Sinfni tanlang — fanlar, testlar va demo materiallar shu yerda jamlangan. IQ Monitoring barcha fanlar uchun bir xil professional UXni saqlaydi."
      />
      <form className="mt-8">
        <div className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Sinf bo‘yicha qidiruv… (masalan, 7)"
            className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none ring-emerald-500/30 focus:ring-2"
          />
          {q ? (
            <a
              href="/sinflar"
              className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              ×
            </a>
          ) : null}
        </div>
      </form>
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {grades.map((g) => (
          <GradeCard key={g.id} number={g.number} name={g.name} colorKey={g.colorKey} />
        ))}
      </div>
      {!grades.length ? <p className="mt-8 text-sm text-slate-600">Qidiruv bo‘yicha sinf topilmadi.</p> : null}
    </div>
  );
}
