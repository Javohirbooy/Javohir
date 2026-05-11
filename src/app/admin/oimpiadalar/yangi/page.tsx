import { auth } from "@/auth";
import { getTestsEligibleForOlympiad } from "@/app/actions/olympiad-admin";
import { OlympiadCreateForm } from "@/components/olympiad/olympiad-create-form";
import { requirePermission } from "@/lib/authz";

export default async function AdminOlympiadCreatePage() {
  const session = await auth();
  requirePermission(session, "OLYMPIAD_MANAGE", { redirectTo: "/admin" });
  const tests = await getTestsEligibleForOlympiad();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Yangi olimpiada</h1>
      <OlympiadCreateForm tests={tests} basePath="/admin/oimpiadalar" />
    </div>
  );
}
