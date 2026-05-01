import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TEST_GRANT_COOKIE, parseTestGrantCookie } from "@/lib/test-access";
import { DashboardCard } from "@/components/dashboard/dashboard-card";

export default async function StudentMonitoringTestsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/kirish");
  if (session.user.role !== "STUDENT") redirect("/");

  const raw = (await cookies()).get(TEST_GRANT_COOKIE)?.value;
  const ids = parseTestGrantCookie(raw);
  if (ids.length === 0) redirect("/oquvchi/test-kod");

  const tests = await prisma.test.findMany({
    where: { id: { in: ids } },
    include: { subject: { include: { grade: true } } },
    orderBy: [{ subject: { title: "asc" } }, { title: "asc" }],
  });

  const byId = new Map(tests.map((t) => [t.id, t]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as typeof tests;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Monitoring testlari</h1>
        <p className="mt-1 text-sm text-white/60">
          Bitta kod orqali ochilgan testlar. Har birini alohida yakunlang — jarayonlar alohida saqlanadi.
        </p>
      </div>

      <DashboardCard className="space-y-3">
        <p className="text-sm text-white/70">
          Jami: <span className="font-semibold text-emerald-200">{ordered.length}</span> ta test
        </p>
        <ul className="space-y-2">
          {ordered.map((t) => (
            <li key={t.id}>
              <Link
                href={`/testlar/${t.id}`}
                className="flex flex-col gap-0.5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:border-emerald-400/35 hover:bg-white/[0.07] sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-semibold text-white">{t.title}</span>
                <span className="text-sm text-emerald-200/90">
                  {t.subject.grade.number}-sinf · {t.subject.title}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/oquvchi/test-kod"
          className="inline-block text-sm font-medium text-sky-300 underline-offset-2 hover:underline"
        >
          Boshqa kod kiritish
        </Link>
      </DashboardCard>
    </div>
  );
}
