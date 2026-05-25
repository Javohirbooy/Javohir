import { redirect } from "next/navigation";
import { getBundleCombinedResults } from "@/app/actions/olympiad-bundle-participant";
import { OlympiadBundleResultsClient } from "@/components/olympiad/olympiad-bundle-results-client";

export const metadata = {
  title: "Yakuniy natijalar — paket",
  robots: { index: false, follow: false } as const,
};

export default async function OlympiadBundleResultsPage() {
  const res = await getBundleCombinedResults();
  if (!res.ok) redirect("/olympiada/join");
  return <OlympiadBundleResultsClient data={res.data} />;
}
