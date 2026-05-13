import { auth } from "@/auth";
import { getTestsEligibleForOlympiad } from "@/app/actions/olympiad-admin";
import { OlympiadCreateForm } from "@/components/olympiad/olympiad-create-form";
import { DashboardDbErrorFallback } from "@/components/dashboard/dashboard-db-error-fallback";
import { requireAuth } from "@/lib/authz";
import { canOlympiadManage } from "@/lib/permissions";
import { tryPrismaPage } from "@/lib/server/try-prisma";
import { redirect } from "next/navigation";

export default async function AdminOlympiadCreatePage() {
  const session = await auth();
  requireAuth(session);
  if (!canOlympiadManage(session)) redirect("/admin");
  const load = await tryPrismaPage("admin.olympiad_create_form", () => getTestsEligibleForOlympiad(), {
    actorId: session.user.id,
  });
  if (!load.ok) return <DashboardDbErrorFallback retryHref="/admin/oimpiadalar/yangi" />;
  const tests = load.data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Yangi olimpiada</h1>
      <OlympiadCreateForm tests={tests} basePath="/admin/oimpiadalar" />
    </div>
  );
}
