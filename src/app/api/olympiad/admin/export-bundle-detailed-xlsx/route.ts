import { auth } from "@/auth";
import { canOlympiadManage } from "@/lib/permissions";
import {
  buildBundleDetailedWorkbook,
  bundleDetailedExcelFilename,
  fetchBundleDetailedExportRows,
} from "@/lib/olympiad/bundle-detailed-results-excel";
import { allowOlympiadCsvExport } from "@/lib/olympiad/csv-export-rate-limit";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FILTER_MAX = 200;

function clampQuery(s: string | null): string {
  const t = (s ?? "").trim();
  return t.length > FILTER_MAX ? t.slice(0, FILTER_MAX) : t;
}

/** Ko‘p fanli paket natijalari — har sinf alohida Excel. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!canOlympiadManage(session)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!allowOlympiadCsvExport(session.user.id)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const url = new URL(req.url);
  const bundleId = clampQuery(url.searchParams.get("bundleId"));
  const filters = {
    bundleId: bundleId || undefined,
    gradeLabel: clampQuery(url.searchParams.get("gradeLabel")) || undefined,
    school: clampQuery(url.searchParams.get("school")) || undefined,
    name: clampQuery(url.searchParams.get("name")) || undefined,
  };

  const { students, subjectColumns, questionBanks } = await fetchBundleDetailedExportRows(
    { role: session.user.role, userId: session.user.id },
    filters,
  );

  if (students.length === 0) {
    return NextResponse.json({ error: "no_results" }, { status: 404 });
  }

  let bundleTitle: string | undefined;
  if (filters.bundleId) {
    const b = await prisma.olympiadBundle.findUnique({
      where: { id: filters.bundleId },
      select: { title: true },
    });
    bundleTitle = b?.title;
  }

  const buffer = buildBundleDetailedWorkbook(students, subjectColumns, questionBanks);
  const filename = bundleDetailedExcelFilename(bundleTitle);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
