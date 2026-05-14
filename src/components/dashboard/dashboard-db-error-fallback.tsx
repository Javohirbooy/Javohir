import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Button } from "@/components/ui/button";

type Props = {
  /** Qayta urinish uchun joriy panel (masalan `/admin`, `/oqituvchi`). */
  retryHref: string;
};

/**
 * DB vaqtincha ishlamasa yoki migratsiya mos kelmasa — umumiy `error.tsx` o‘rniga panel ichida.
 */
export function DashboardDbErrorFallback({ retryHref }: Props) {
  return (
    <div className="space-y-6">
      <DashboardCard>
        <h1 className="font-display text-xl font-bold tracking-tight">Panel vaqtincha yuklanmadi</h1>
        <p className="mt-2 text-sm text-white/75">
          Ma&apos;lumotlar bazasiga ulanishda xatolik yuz berdi. Vercelda PostgreSQL ulanishi (
          <code className="rounded bg-white/10 px-1">DATABASE_URL</code> yoki Neon bergan{" "}
          <code className="rounded bg-white/10 px-1">POSTGRES_PRISMA_URL</code>) va migratsiyalarni tekshiring.
        </p>
        <p className="mt-2 text-xs text-white/50">
          Texnik: <code className="rounded bg-white/10 px-1">/api/health</code> — `database: true` bo‘lishi kerak.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button href={retryHref} variant="primary" className="px-4 py-2 text-sm">
            Qayta yuklash
          </Button>
          <Button href="/api/health?ui=1" variant="glass" className="px-4 py-2 text-sm">
            Holat (health)
          </Button>
          <Button href="/" variant="glass" className="px-4 py-2 text-sm">
            Bosh sahifa
          </Button>
        </div>
      </DashboardCard>
    </div>
  );
}
