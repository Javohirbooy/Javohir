import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { OlympiadBundleAdminResultsPanel } from "@/components/olympiad/olympiad-bundle-admin-results-panel";
import { requireAuth } from "@/lib/authz";
import { canOlympiadManage } from "@/lib/permissions";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function pickString(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

const BASE = "/oqituvchi/oimpiadalar";

export default async function TeacherBundleResultsPage({ searchParams }: Props) {
  const session = await auth();
  requireAuth(session);
  if (!canOlympiadManage(session)) redirect("/oqituvchi");
  const sp = await searchParams;
  const flat: Record<string, string | undefined> = {
    bundleId: pickString(sp.bundleId),
    grade: pickString(sp.grade),
    school: pickString(sp.school),
    q: pickString(sp.q),
    page: pickString(sp.page),
  };
  return (
    <div className="mx-auto max-w-6xl">
      <OlympiadBundleAdminResultsPanel
        searchParams={flat}
        resultsHref={`${BASE}/natijalar/paket`}
        backHref={BASE}
        basePath={BASE}
      />
    </div>
  );
}
