import { prisma } from "@/lib/prisma";
import { SectionTitle } from "@/components/ui/section-title";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Trophy } from "lucide-react";

export default async function LeaderboardPage() {
  const rows = await prisma.testResult.findMany({
    orderBy: { score: "desc" },
    take: 15,
    include: { user: true, test: { include: { subject: { include: { grade: true } } } } },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:py-20">
      <SectionTitle
        onDark
        eyebrow="IQ Monitoring"
        title="Eng yuqori natijalar"
        subtitle="Demo ma’lumotlar asosida test ballari. Productionda sinf va fan bo‘yicha filtrlash qo‘shiladi."
      />
      <div className="mt-12 space-y-4">
        {rows.length === 0 ? (
          <Card className="border-emerald-100 bg-white p-10 text-center text-slate-700 backdrop-blur-xl">Hozircha natijalar yo‘q.</Card>
        ) : (
          rows.map((r, i) => (
            <Card
              key={r.id}
              className="iq-3d-card flex flex-col gap-4 border-emerald-100 bg-gradient-to-br from-white via-emerald-50/55 to-white p-6 text-slate-800 shadow-xl shadow-emerald-900/10 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-4">
                <span className="iq-3d-chip flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-lg font-black text-white shadow-lg ring-1 ring-emerald-200">
                  {i + 1}
                </span>
                <div>
                  <p className="flex items-center gap-2 font-bold text-slate-800">
                    {r.user.avatarEmoji ? <span>{r.user.avatarEmoji}</span> : null}
                    {r.user.name}
                  </p>
                  <p className="text-sm text-slate-600">
                    {r.test.title} · {r.test.subject.grade.number}-sinf · {r.test.subject.title}
                  </p>
                </div>
              </div>
              <div className="w-full sm:max-w-xs">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
                  <span className="flex items-center gap-1 text-emerald-700">
                    <Trophy className="h-4 w-4 text-amber-400" />
                    {Math.round(r.score)} ball
                  </span>
                </div>
                <ProgressBar value={r.score} className="mt-2 from-emerald-500 to-green-500" trackClassName="bg-emerald-100" />
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
