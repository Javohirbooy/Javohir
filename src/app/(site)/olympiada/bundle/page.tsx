import { redirect } from "next/navigation";
import { getBundleDashboardForCookie } from "@/app/actions/olympiad-bundle-participant";
import { OlympiadBundleSubjectSelector } from "@/components/olympiad/olympiad-bundle-subject-selector";

export const metadata = {
  title: "Fanlar — ko‘p fanli imtihon",
  robots: { index: false, follow: false } as const,
};

export default async function OlympiadBundleDashboardPage() {
  const res = await getBundleDashboardForCookie();
  if (!res.ok) redirect("/olympiada/join");
  return <OlympiadBundleSubjectSelector dashboard={res.data} />;
}
