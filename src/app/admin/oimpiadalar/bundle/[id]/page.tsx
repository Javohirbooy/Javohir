import { notFound } from "next/navigation";
import { getOlympiadBundleAdminDetail } from "@/app/actions/olympiad-bundle-admin";
import { OlympiadBundleAdminDetail } from "@/components/olympiad/olympiad-bundle-admin-detail";

export const metadata = { title: "Paket — olimpiada" };

export default async function AdminBundleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bundle = await getOlympiadBundleAdminDetail(id);
  if (!bundle) notFound();
  return <OlympiadBundleAdminDetail bundle={bundle} basePath="/admin/oimpiadalar" />;
}
