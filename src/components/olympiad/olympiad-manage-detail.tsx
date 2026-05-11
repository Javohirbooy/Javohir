import Link from "next/link";
import { notFound } from "next/navigation";
import { getOlympiadAdminDetail } from "@/app/actions/olympiad-admin";
import { olympiadControlFormAction, publishOlympiadResultsFormAction, addOlympiadCodeFormAction } from "@/app/actions/olympiad-admin";
import { prisma } from "@/lib/prisma";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OlympiadLiveMonitor } from "@/components/olympiad/olympiad-live-monitor";
import { OlympiadExportButton } from "@/components/olympiad/olympiad-export-button";
import { OlympiadFinalizationSection } from "@/components/olympiad/olympiad-finalization-section";

export async function OlympiadManageDetail({ id, basePath }: { id: string; basePath: string }) {
  const olymp = await getOlympiadAdminDetail(id);
  if (!olymp) notFound();

  const violations = await prisma.olympiadViolation.findMany({
    where: { session: { olympiadId: id } },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      session: {
        include: { participant: { select: { firstName: true, lastName: true, gradeLabel: true } } },
      },
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={basePath} className="text-sm font-semibold text-emerald-700 hover:text-emerald-600">
            ← Ro‘yxat
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{olymp.title}</h1>
          <p className="text-sm text-slate-600">
            Test: {olymp.test.title} · holat: {olymp.status} · qatnashchilar: {olymp._count.participants}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <OlympiadExportButton olympiadId={id} />
        </div>
      </div>

      <DashboardCard title="Boshqaruv">
        <div className="flex flex-wrap gap-2">
          <form action={olympiadControlFormAction}>
            <input type="hidden" name="olympiadId" value={id} />
            <Button type="submit" name="intent" value="pause" variant="secondary">
              Pauza
            </Button>
          </form>
          <form action={olympiadControlFormAction}>
            <input type="hidden" name="olympiadId" value={id} />
            <Button type="submit" name="intent" value="resume" variant="secondary">
              Davom ettirish
            </Button>
          </form>
          <form action={olympiadControlFormAction}>
            <input type="hidden" name="olympiadId" value={id} />
            <Button type="submit" name="intent" value="end" variant="danger">
              Yakunlash
            </Button>
          </form>
          <form action={publishOlympiadResultsFormAction}>
            <input type="hidden" name="olympiadId" value={id} />
            <Button type="submit">Natijalarni e&apos;lon qilish</Button>
          </form>
        </div>
        <p className="mt-3 text-xs text-slate-600">
          E&apos;lon qilish barcha yuborilgan urinishlar uchun reyting va ko‘rinishni yoqadi (admin tekshiruvi keyingi bosqichda kengaytiriladi).
        </p>
      </DashboardCard>

      <DashboardCard title="Kirish kodlari (faqat oxirgi 4 belgi ko‘rsatiladi)">
        <ul className="space-y-1 text-sm text-slate-700">
          {olymp.codes.length === 0 ? <li>Hozircha kod yo‘q.</li> : null}
          {olymp.codes.map((c) => (
            <li key={c.id}>
              {c.codeHint ?? "****"} · ishlatilgan: {c.usesCount}
              {c.maxUses != null ? ` / ${c.maxUses}` : ""}
            </li>
          ))}
        </ul>
        <Card className="mt-4 border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">Yangi kod</p>
          <form action={addOlympiadCodeFormAction} className="mt-3 space-y-2">
            <input type="hidden" name="olympiadId" value={id} />
            <input name="plainCode" required placeholder="OLYMPIADA-8A-2026" className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm" />
            <div className="flex flex-wrap gap-2">
              <input name="maxUses" type="number" min={1} placeholder="Limit (ixtiyoriy)" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input name="expiresAt" type="datetime-local" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <Button type="submit" className="px-4 py-2 text-xs">
              Qo‘shish
            </Button>
          </form>
        </Card>
      </DashboardCard>

      <OlympiadFinalizationSection olympiadId={id} basePath={basePath} />

      <DashboardCard title="Jonli monitoring">
        <OlympiadLiveMonitor olympiadId={id} />
      </DashboardCard>

      <DashboardCard title="So‘nggi qoidabuzarliklar / signal">
        <div className="max-h-[360px] space-y-2 overflow-y-auto text-sm">
          {violations.length === 0 ? <p className="text-slate-600">Yozuvlar yo‘q.</p> : null}
          {violations.map((v) => (
            <div key={v.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="font-medium text-slate-900">{v.type}</p>
              <p className="text-xs text-slate-600">
                {v.session.participant.firstName} {v.session.participant.lastName} ·{" "}
                {new Date(v.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </DashboardCard>
    </div>
  );
}
