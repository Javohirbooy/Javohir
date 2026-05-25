import { auth } from "@/auth";
import { listAdminOlympiadResultsTable } from "@/app/actions/olympiad-admin";
import { canOlympiadManage } from "@/lib/permissions";
import { allowOlympiadCsvExport } from "@/lib/olympiad/csv-export-rate-limit";
import { EXCEL_UTF8_CSV_PREFIX } from "@/lib/csv/excel-csv";
import {
  formatOlympiadResultCsvLine,
  natijalarCsvFilename,
  OLYMPIAD_RESULTS_CSV_HEADER_LINE,
} from "@/lib/olympiad/olympiad-results-csv-format";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FILTER_MAX = 200;

function clampQuery(s: string | null): string {
  const t = (s ?? "").trim();
  return t.length > FILTER_MAX ? t.slice(0, FILTER_MAX) : t;
}

/**
 * Filtrlangan admin olimpiada natijalari — server stream, UTF-8 BOM + Excel `sep=,`.
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
  const olympiadId = clampQuery(url.searchParams.get("olympiadId"));
  const gradeLabel = clampQuery(url.searchParams.get("gradeLabel"));
  const school = clampQuery(url.searchParams.get("school"));
  const name = clampQuery(url.searchParams.get("name"));

  const filename = natijalarCsvFilename();
  const encoder = new TextEncoder();
  const MAX_CSV_ROWS = 2000;
  const PAGE_SIZE = 100;

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`${EXCEL_UTF8_CSV_PREFIX}${OLYMPIAD_RESULTS_CSV_HEADER_LINE}\r\n`));
      let page = 1;
      let totalRows = 0;
      for (;;) {
        if (totalRows >= MAX_CSV_ROWS) break;
        const table = await listAdminOlympiadResultsTable({
          olympiadId: olympiadId || undefined,
          gradeLabel: gradeLabel || undefined,
          school: school || undefined,
          name: name || undefined,
          page,
          pageSize: PAGE_SIZE,
        });
        if (!table || !table.rows.length) break;
        for (const r of table.rows) {
          if (totalRows >= MAX_CSV_ROWS) break;
          const line = formatOlympiadResultCsvLine({
            rank: r.rank,
            score: r.score,
            maxScore: r.maxScore,
            firstName: r.firstName,
            lastName: r.lastName,
            gradeLabel: r.gradeLabel,
            schoolName: r.schoolName,
            olympiadTitle: r.olympiadTitle,
            timeSpentSec: r.timeSpentSec,
            published: r.published,
          });
          controller.enqueue(encoder.encode(`${line}\r\n`));
          totalRows += 1;
        }
        if (table.rows.length < PAGE_SIZE) break;
        page += 1;
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
