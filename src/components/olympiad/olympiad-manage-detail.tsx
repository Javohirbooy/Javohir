import Link from "next/link";
import { notFound } from "next/navigation";
import { getOlympiadAdminDetail } from "@/app/actions/olympiad-admin";
import {
  olympiadControlFormAction,
  publishOlympiadResultsFormAction,
  addOlympiadCodeFormAction,
  issueOlympiadCertificatesFormAction,
  revokeOlympiadCertificateFormAction,
} from "@/app/actions/olympiad-admin";
import { prisma } from "@/lib/prisma";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { DashboardDbErrorFallback } from "@/components/dashboard/dashboard-db-error-fallback";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OlympiadLiveMonitor } from "@/components/olympiad/olympiad-live-monitor";
import { isOlympiadMonitorSseEnabled } from "@/lib/olympiad/feature-flags";
import { OlympiadDetailedExcelExportButton } from "@/components/olympiad/olympiad-detailed-excel-export-button";
import { OlympiadExportButton } from "@/components/olympiad/olympiad-export-button";
import { OlympiadFinalizationSection } from "@/components/olympiad/olympiad-finalization-section";
import { OlympiadScheduleForm } from "@/components/olympiad/olympiad-schedule-form";
import { tryPrismaPage } from "@/lib/server/try-prisma";

export async function OlympiadManageDetail({ id, basePath }: { id: string; basePath: string }) {
  const load = await tryPrismaPage(
    "olympiad.manage_detail_load",
    async () => {
      const olymp = await getOlympiadAdminDetail(id);
      if (!olymp) return { mode: "not_found" as const };
      const [certificates, violations] = await Promise.all([
        prisma.olympiadCertificate.findMany({
          where: { result: { olympiadId: id } },
          orderBy: { issuedAt: "desc" },
          take: 80,
          include: {
            result: {
              select: {
                score: true,
                rank: true,
                participant: { select: { firstName: true, lastName: true } },
              },
            },
          },
        }),
        prisma.olympiadViolation.findMany({
          where: { session: { olympiadId: id } },
          orderBy: { createdAt: "desc" },
          take: 80,
          include: {
            session: {
              include: { participant: { select: { firstName: true, lastName: true, gradeLabel: true } } },
            },
          },
        }),
      ]);
      return { mode: "ok" as const, olymp, certificates, violations };
    },
    { olympiadId: id },
  );

  if (!load.ok) return <DashboardDbErrorFallback retryHref={basePath} />;
  if (load.data.mode === "not_found") return notFound();
  const { olymp, certificates, violations } = load.data;

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
          <OlympiadDetailedExcelExportButton olympiadId={id} />
          <OlympiadExportButton olympiadId={id} />
          <Button href={`${basePath}/natijalar?olympiadId=${encodeURIComponent(id)}`} variant="outline">
            Natijalar jadvali
          </Button>
        </div>
      </div>

      <DashboardCard title="Olimpiada jadvali">
        <p className="text-sm text-slate-600">
          Boshlanish va yakun vaqtlari alohida saqlanadi; biri ikkinchisini avtomatik o‘zgartirmaydi. Yakunni bo‘sh qoldirsangiz, faqat test davomiyligi bilan chegaralanadi.
        </p>
        <OlympiadScheduleForm
          key={olymp.updatedAt.toISOString()}
          olympiadId={id}
          startsAtIso={olymp.startsAt.toISOString()}
          endsAtIso={olymp.endsAt?.toISOString() ?? null}
        />
      </DashboardCard>

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

      <DashboardCard title="Sertifikatlar (PDF + QR tekshiruv)">
        <p className="text-sm text-slate-600">
          Natijalar e&apos;lon qilingach, PDF va jamoat tekshiruv havolasi yaratiladi. Talab:{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">BLOB_READ_WRITE_TOKEN</code>.
        </p>
        <form action={issueOlympiadCertificatesFormAction} className="mt-4">
          <input type="hidden" name="olympiadId" value={id} />
          <input type="hidden" name="revalidatePrefix" value={basePath} />
          <Button type="submit" variant="secondary">
            PDF sertifikatlarni chiqarish / yangilash
          </Button>
        </form>
        <div className="mt-6 max-h-[280px] space-y-2 overflow-y-auto text-sm">
          {certificates.length === 0 ? <p className="text-slate-600">Hozircha sertifikat yo‘q.</p> : null}
          {certificates.map((c) => (
            <div key={c.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-slate-900">
                  {c.result.participant.firstName} {c.result.participant.lastName}
                </p>
                <p className="text-xs text-slate-600">
                  rank {c.result.rank ?? "—"} · ball {c.result.score ?? "—"} ·{" "}
                  {c.revokedAt ? <span className="text-rose-700">bekor qilingan</span> : "faol"}
                </p>
                {c.verifyPublicId ? (
                  <p className="mt-1 break-all font-mono text-[11px] text-slate-500">{c.verifyPublicId}</p>
                ) : null}
              </div>
              {!c.revokedAt && c.verifyPublicId ? (
                <form action={revokeOlympiadCertificateFormAction} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="olympiadId" value={id} />
                  <input type="hidden" name="revalidatePrefix" value={basePath} />
                  <input type="hidden" name="verifyPublicId" value={c.verifyPublicId} />
                  <input name="reason" placeholder="Sabab" className="min-w-[8rem] rounded border border-slate-200 px-2 py-1 text-xs" />
                  <Button type="submit" variant="danger" className="px-2 py-1 text-xs">
                    Bekor qilish
                  </Button>
                </form>
              ) : null}
            </div>
          ))}
        </div>
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
        <OlympiadLiveMonitor olympiadId={id} monitorSseEnabled={isOlympiadMonitorSseEnabled()} />
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
