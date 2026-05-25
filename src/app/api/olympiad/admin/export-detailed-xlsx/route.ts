import { auth } from "@/auth";
import { canOlympiadManage } from "@/lib/permissions";
import { allowOlympiadCsvExport } from "@/lib/olympiad/csv-export-rate-limit";
import {
  buildDetailedResultsWorkbook,
  detailedResultsExcelFilename,
  fetchDetailedOlympiadExportData,
} from "@/lib/olympiad/detailed-results-excel";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FILTER_MAX = 200;

function clampQuery(s: string | null): string {
  const t = (s ?? "").trim();
  return t.length > FILTER_MAX ? t.slice(0, FILTER_MAX) : t;
}

/**
 * Admin: har sinf uchun alohida Excel — talaba, test, xatolar, savol matritsasi.
 */
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
  const filters = {
    olympiadId: clampQuery(url.searchParams.get("olympiadId")),
    gradeLabel: clampQuery(url.searchParams.get("gradeLabel")),
    school: clampQuery(url.searchParams.get("school")),
    name: clampQuery(url.searchParams.get("name")),
  };

  const { students, questionBanks } = await fetchDetailedOlympiadExportData(
    { role: session.user.role, userId: session.user.id },
    {
      olympiadId: filters.olympiadId || undefined,
      gradeLabel: filters.gradeLabel || undefined,
      school: filters.school || undefined,
      name: filters.name || undefined,
    },
  );

  if (students.length === 0) {
    return NextResponse.json({ error: "no_results" }, { status: 404 });
  }

  let olympiadTitle: string | undefined;
  if (filters.olympiadId) {
    const o = await prisma.olympiad.findUnique({
      where: { id: filters.olympiadId },
      select: { title: true },
    });
    olympiadTitle = o?.title;
  }

  const buffer = buildDetailedResultsWorkbook(students, questionBanks);
  const filename = detailedResultsExcelFilename(olympiadTitle);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
