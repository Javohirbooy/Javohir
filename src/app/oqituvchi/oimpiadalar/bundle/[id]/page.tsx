import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getOlympiadBundleAdminDetail } from "@/app/actions/olympiad-bundle-admin";
import { OlympiadBundleAdminDetail } from "@/components/olympiad/olympiad-bundle-admin-detail";
import { requireAuth } from "@/lib/authz";
import { canOlympiadManage } from "@/lib/permissions";

export const metadata = { title: "Paket — olimpiada" };

const BASE = "/oqituvchi/oimpiadalar";

export default async function TeacherBundleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  requireAuth(session);
  if (!canOlympiadManage(session)) redirect("/oqituvchi");
  const { id } = await params;
  const bundle = await getOlympiadBundleAdminDetail(id);
  if (!bundle) notFound();
  return <OlympiadBundleAdminDetail bundle={bundle} basePath={BASE} />;
}
