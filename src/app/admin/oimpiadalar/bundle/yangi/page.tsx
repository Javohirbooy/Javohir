import Link from "next/link";
import { listTestsForBundlePicker } from "@/app/actions/olympiad-bundle-admin";
import { OlympiadBundleCreateForm } from "@/components/olympiad/olympiad-bundle-create-form";

export const metadata = { title: "Yangi paket — olimpiada" };

export default async function AdminNewBundlePage() {
  const tests = await listTestsForBundlePicker();
  return (
    <div className="space-y-6">
      <Link href="/admin/oimpiadalar" className="text-sm font-semibold text-emerald-700 hover:text-emerald-600">
        ← Olimpiadalar
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">Ko‘p fanli paket yaratish</h1>
      <p className="text-sm text-slate-600">
        Bitta kod orqali bir nechta tayyor testni birlashtiring (har test uchun olimpiada avtomatik yaratiladi).
      </p>
      <OlympiadBundleCreateForm tests={tests} basePath="/admin/oimpiadalar" />
    </div>
  );
}
