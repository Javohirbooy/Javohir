import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { deleteTest } from "@/app/actions/teacher-tests";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Badge } from "@/components/ui/badge";
import { sessionHasPermission } from "@/lib/permissions";

export default async function AdminTestsPage() {
  const session = await auth();
  requirePermission(session, "TESTS_VIEW", { redirectTo: "/admin" });

  const tests = await prisma.test.findMany({
    orderBy: { title: "asc" },
    include: {
      subject: { include: { grade: true } },
      _count: { select: { questions: true, results: true } },
    },
    take: 200,
  });

  const canDelete = sessionHasPermission(session, "TESTS_DELETE");
  const canEdit = sessionHasPermission(session, "TESTS_EDIT");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Testlar</h1>
          <p className="mt-1 text-sm text-white/70">Barcha testlar — admin yaratgan (author null) va o‘qituvchi testlari.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/testlar/import"
            className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Import
          </Link>
          <Link
            href="/admin/testlar/yangi"
            className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-900/40 ring-1 ring-white/20 transition hover:brightness-110"
          >
            + Yangi test
          </Link>
        </div>
      </div>

      <DashboardCard>
        <ul className="divide-y divide-white/10">
          {tests.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold leading-snug text-white">{t.title}</p>
                <p className="mt-0.5 text-xs text-white/60">
                  {t.subject.title} · {t.subject.grade.name} · {t.difficulty}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge className="border-white/15 bg-white/10">{t._count.questions} savol</Badge>
                  <Badge className="border-white/15 bg-white/10">{t._count.results} topshirish</Badge>
                  {t.authorUserId == null ? (
                    <Badge className="border-sky-400/30 bg-sky-500/15 text-sky-100">Platforma</Badge>
                  ) : (
                    <Badge className="border-fuchsia-400/30 bg-fuchsia-500/15 text-fuchsia-100">O‘qituvchi</Badge>
                  )}
                  {t.isDraft ? (
                    <Badge className="border-amber-400/30 bg-amber-500/15 text-amber-100">Qoralama</Badge>
                  ) : null}
                  {!t.isActive ? (
                    <Badge className="border-white/20 bg-white/5 text-white/60">O‘chirilgan</Badge>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {canEdit ? (
                  <Link
                    href={`/admin/testlar/${t.id}/tahrirlash`}
                    className="rounded-xl border border-violet-400/35 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/20"
                  >
                    Tahrirlash
                  </Link>
                ) : null}
                <Link
                  href={`/testlar/${t.id}`}
                  className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
                >
                  Ko‘rish
                </Link>
                {canDelete ? (
                  <form action={deleteTest}>
                    <input type="hidden" name="testId" value={t.id} />
                    <button
                      type="submit"
                      className="rounded-xl border border-rose-400/35 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20"
                    >
                      O‘chirish
                    </button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </DashboardCard>
    </div>
  );
}
