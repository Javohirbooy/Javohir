import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { OlympiadAdminResultsPanel } from "@/components/olympiad/olympiad-admin-results-panel";
import { requireAuth } from "@/lib/authz";
import { canOlympiadManage } from "@/lib/permissions";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function pickString(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

export default async function AdminOlympiadResultsPage({ searchParams }: Props) {
  const session = await auth();
  requireAuth(session);
  if (!canOlympiadManage(session)) redirect("/admin");
  const sp = await searchParams;
  const flat: Record<string, string | undefined> = {
    olympiadId: pickString(sp.olympiadId),
    grade: pickString(sp.grade),
    school: pickString(sp.school),
    q: pickString(sp.q),
    page: pickString(sp.page),
  };
  return (
    <div className="mx-auto max-w-6xl">
      <OlympiadAdminResultsPanel
        searchParams={flat}
        resultsHref="/admin/oimpiadalar/natijalar"
        backHref="/admin/oimpiadalar"
      />
    </div>
  );
}
