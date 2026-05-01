import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import type { Prisma } from "@prisma/client";

type AuditFilter = "all" | "exam" | "credentials" | "tests" | "teachers" | "auth";

type Props = { searchParams?: Promise<{ filter?: string }> };

const FILTER_ACTIONS: Record<Exclude<AuditFilter, "all">, string[]> = {
  exam: ["EXAM_ATTEMPT_BEGIN", "EXAM_ATTEMPT_SUBMIT", "EXAM_VIOLATION"],
  credentials: [
    "STUDENT_CREDENTIAL_CREATE",
    "STUDENT_CREATED",
    "STUDENT_UPDATED",
    "STUDENT_PASSWORD_RESET",
  ],
  tests: ["TEST_CREATE", "TEST_PUBLISH", "TEST_UPDATE", "TEST_IMPORT_DRAFT"],
  teachers: ["TEACHER_PROVISION", "TEACHER_ASSIGNMENT_UPDATE"],
  auth: ["auth.sign_in"],
};

function parseFilter(raw: string | undefined): AuditFilter {
  const v = (raw ?? "all").toLowerCase();
  if (v === "exam" || v === "credentials" || v === "tests" || v === "teachers" || v === "auth") return v;
  return "all";
}

export default async function AdminAuditPage({ searchParams }: Props) {
  const session = await auth();
  requirePermission(session, "AUDIT_READ", { redirectTo: "/admin" });

  const sp = (await searchParams) ?? {};
  const filter = parseFilter(sp.filter);

  const where: Prisma.AuditLogWhereInput =
    filter === "all"
      ? {}
      : {
          action: { in: FILTER_ACTIONS[filter] },
        };

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: { select: { email: true, name: true } } },
  });

  const tabs: { id: AuditFilter; label: string }[] = [
    { id: "all", label: "Hammasi" },
    { id: "exam", label: "Imtihon" },
    { id: "credentials", label: "O‘quvchi login" },
    { id: "tests", label: "Testlar" },
    { id: "teachers", label: "O‘qituvchilar" },
    { id: "auth", label: "Kirish" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Audit jurnali</h1>
        <p className="mt-1 text-sm text-white/60">
          Muhim amallar: imtihon boshlash/yuborish, qoidalarni buzish, o‘quvchi parollari, test import va o‘qituvchi tayinlash.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const active = filter === t.id;
          const href = t.id === "all" ? "/admin/audit" : `/admin/audit?filter=${t.id}`;
          return (
            <Link
              key={t.id}
              href={href}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-white text-slate-900 shadow"
                  : "border border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <DashboardCard className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-white/45">
            <tr>
              <th className="px-4 py-3 font-semibold">Vaqt</th>
              <th className="px-4 py-3 font-semibold">Ijrochi</th>
              <th className="px-4 py-3 font-semibold">Amal</th>
              <th className="px-4 py-3 font-semibold">Ob’ekt</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-white/5 text-white/85 hover:bg-white/[0.03]">
                <td className="whitespace-nowrap px-4 py-3 text-white/60">{r.createdAt.toISOString().slice(0, 19).replace("T", " ")}</td>
                <td className="px-4 py-3">{r.actor ? `${r.actor.name} · ${r.actor.email}` : "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-cyan-200/90">{r.action}</td>
                <td className="px-4 py-3 text-white/70">
                  {r.entityType ?? "—"} {r.entityId ? <span className="text-white/45">({r.entityId.slice(0, 8)}…)</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="border-t border-white/10 px-4 py-6 text-center text-sm text-white/50">Bu filtr bo‘yicha yozuvlar yo‘q.</p>
        ) : null}
      </DashboardCard>
    </div>
  );
}
