import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canOlympiadManage } from "@/lib/permissions";
import { allowOlympiadCsvExport } from "@/lib/olympiad/csv-export-rate-limit";
import { recomputeBundleRanks } from "@/lib/olympiad/bundle-aggregate";
import { EXCEL_UTF8_CSV_PREFIX } from "@/lib/csv/excel-csv";
import {
  bundleNatijalarCsvFilename,
  formatOlympiadBundleResultCsvLine,
  OLYMPIAD_BUNDLE_RESULTS_CSV_HEADER_LINE,
} from "@/lib/olympiad/bundle-results-csv-format";
import { isOlympiadExamTerminalStatus } from "@/lib/olympiad/exam-state-machine";
import { olympiadBundleIdParamSchema } from "@/lib/olympiad/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ bundleId: string }> }) {
  const session = await auth();
  const rawParams = await ctx.params;
  const parsedId = olympiadBundleIdParamSchema.safeParse(rawParams.bundleId);
  if (!parsedId.success) {
    return NextResponse.json({ error: "invalid_params" }, { status: 400 });
  }
  const bundleId = parsedId.data;
  if (!session?.user?.id || !canOlympiadManage(session)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!allowOlympiadCsvExport(session.user.id)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const bundle = await prisma.olympiadBundle.findUnique({
    where: { id: bundleId },
    select: {
      title: true,
      _count: { select: { subjects: true } },
    },
  });
  if (!bundle) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await recomputeBundleRanks(bundleId).catch(() => undefined);

  const filename = bundleNatijalarCsvFilename(bundle.title);
  const encoder = new TextEncoder();
  const totalSubjects = bundle._count.subjects;

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`${EXCEL_UTF8_CSV_PREFIX}${OLYMPIAD_BUNDLE_RESULTS_CSV_HEADER_LINE}\r\n`));
      const pageSize = 200;
      let skip = 0;
      let rowsWritten = 0;
      const MAX_ROWS = 15_000;
      for (;;) {
        if (rowsWritten >= MAX_ROWS) break;
        const rows = await prisma.olympiadBundleAttempt.findMany({
          where: { bundleId },
          orderBy: [{ totalScore: "desc" }, { id: "asc" }],
          skip,
          take: pageSize,
          select: {
            id: true,
            totalScore: true,
            totalMaxScore: true,
            completedAt: true,
            overallRank: true,
            bundleParticipant: {
              select: { firstName: true, lastName: true, gradeLabel: true, schoolName: true },
            },
            sessions: { select: { status: true } },
          },
        });
        if (rows.length === 0) break;
        for (const r of rows) {
          const completedSubjects = r.sessions.filter((s) => isOlympiadExamTerminalStatus(s.status)).length;
          controller.enqueue(
            encoder.encode(
              `${formatOlympiadBundleResultCsvLine({
                overallRank: r.overallRank,
                totalScore: r.totalScore,
                totalMaxScore: r.totalMaxScore,
                firstName: r.bundleParticipant.firstName,
                lastName: r.bundleParticipant.lastName,
                gradeLabel: r.bundleParticipant.gradeLabel,
                schoolName: r.bundleParticipant.schoolName,
                completedSubjects,
                totalSubjects,
                completed: r.completedAt != null,
              })}\r\n`,
            ),
          );
          rowsWritten++;
        }
        if (rows.length < pageSize) break;
        skip += rows.length;
      }
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
