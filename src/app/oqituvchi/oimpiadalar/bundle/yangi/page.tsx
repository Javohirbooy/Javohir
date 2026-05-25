import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listTestsForBundlePicker } from "@/app/actions/olympiad-bundle-admin";
import { OlympiadBundleCreateForm } from "@/components/olympiad/olympiad-bundle-create-form";
import { requireAuth } from "@/lib/authz";
import { canOlympiadManage } from "@/lib/permissions";

export const metadata = { title: "Yangi paket — olimpiada" };

const BASE = "/oqituvchi/oimpiadalar";

export default async function TeacherNewBundlePage() {
  const session = await auth();
  requireAuth(session);
  if (!canOlympiadManage(session)) redirect("/oqituvchi");
  const tests = await listTestsForBundlePicker();
  return (
    <div className="space-y-6">
      <Link href={BASE} className="text-sm font-semibold text-emerald-700 hover:text-emerald-600">
        ← Olimpiadalar
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">Ko‘p fanli paket yaratish</h1>
      <p className="text-sm text-slate-600">Bitta kod orqali bir nechta fan testlarini birlashtiring.</p>
      <OlympiadBundleCreateForm tests={tests} basePath={BASE} />
    </div>
  );
}
