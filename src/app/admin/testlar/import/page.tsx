import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { ImportTestForm } from "@/components/tests/import-test-form";

export default async function AdminImportTestPage() {
  const session = await auth();
  requirePermission(session, "TESTS_CREATE", { redirectTo: "/admin/testlar" });

  const subjects = await prisma.subject.findMany({
    orderBy: [{ grade: { number: "asc" } }, { title: "asc" }],
    include: { grade: true },
  });

  const opts = subjects.map((s) => ({ id: s.id, title: s.title, gradeLabel: s.grade.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Test import</h1>
        <p className="mt-1 text-sm text-white/60">Matnni tahlil qilib qoralama yaratadi — avval ko‘rib chiqasiz, keyin nashr.</p>
      </div>
      <ImportTestForm subjects={opts} reviewBasePath="/admin/testlar/import/review" />
    </div>
  );
}
