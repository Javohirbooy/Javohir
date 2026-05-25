import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertOlympiadManage } from "@/lib/olympiad/authz";
import { allowOlympiadCsvExport } from "@/lib/olympiad/csv-export-rate-limit";
import { EXCEL_UTF8_CSV_PREFIX } from "@/lib/csv/excel-csv";
import {
  formatOlympiadResultCsvLine,
  natijalarCsvFilename,
  OLYMPIAD_RESULTS_CSV_HEADER_LINE,
  timeSpentSeconds,
} from "@/lib/olympiad/olympiad-results-csv-format";
import { olympiadIdParamSchema } from "@/lib/olympiad/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Bitta olimpiada natijalari — UTF-8 BOM + `sep=,` (Excel), streaming.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ olympiadId: string }> }) {
  const session = await auth();
  const rawParams = await ctx.params;
  const parsedId = olympiadIdParamSchema.safeParse(rawParams.olympiadId);
  if (!parsedId.success) {
    return NextResponse.json({ error: "invalid_params" }, { status: 400 });
  }
  const olympiadId = parsedId.data;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!allowOlympiadCsvExport(session.user.id)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  try {
    await assertOlympiadManage(session, olympiadId);
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const olymp = await prisma.olympiad.findUnique({
    where: { id: olympiadId },
    select: { title: true },
  });
  if (!olymp) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const filename = natijalarCsvFilename();
  const encoder = new TextEncoder();
  const title = olymp.title;

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`${EXCEL_UTF8_CSV_PREFIX}${OLYMPIAD_RESULTS_CSV_HEADER_LINE}\r\n`));
      const pageSize = 200;
      let cursor: { id: string } | undefined;
      let rowsWritten = 0;
      const MAX_ROWS = 15_000;
      for (;;) {
        if (rowsWritten >= MAX_ROWS) break;
        const rows = await prisma.olympiadResult.findMany({
          where: { olympiadId },
          select: {
            id: true,
            rank: true,
            score: true,
            maxScore: true,
            published: true,
            participant: {
              select: {
                firstName: true,
                lastName: true,
                gradeLabel: true,
                schoolName: true,
              },
            },
            session: { select: { startedAt: true, submittedAt: true } },
          },
          orderBy: [{ rank: "asc" }, { score: "desc" }, { id: "asc" }],
          take: pageSize,
          ...(cursor ? { skip: 1, cursor } : {}),
        });
        if (!rows.length) break;
        for (const r of rows) {
          if (rowsWritten >= MAX_ROWS) break;
          const p = r.participant;
          const line = formatOlympiadResultCsvLine({
            rank: r.rank,
            score: r.score,
            maxScore: r.maxScore,
            firstName: p.firstName,
            lastName: p.lastName,
            gradeLabel: p.gradeLabel,
            schoolName: p.schoolName,
            olympiadTitle: title,
            timeSpentSec: timeSpentSeconds(r.session.startedAt, r.session.submittedAt),
            published: r.published,
          });
          controller.enqueue(encoder.encode(`${line}\r\n`));
          rowsWritten += 1;
        }
        cursor = { id: rows[rows.length - 1]!.id };
        if (rows.length < pageSize) break;
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
