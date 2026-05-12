import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertOlympiadManage } from "@/lib/olympiad/authz";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function csvEscape(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Natijalar CSV — streaming (xotira tejamkor).
 */
export async function GET(_req: Request, ctx: { params: Promise<{ olympiadId: string }> }) {
  const session = await auth();
  const { olympiadId } = await ctx.params;
  try {
    await assertOlympiadManage(session, olympiadId);
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const olymp = await prisma.olympiad.findUnique({
    where: { id: olympiadId },
    select: { title: true, slug: true },
  });
  if (!olymp) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const filename = `olympiad-${olymp.slug}-results.csv`;
  const encoder = new TextEncoder();
  const header = ["rank", "score", "maxScore", "firstName", "lastName", "grade", "school", "region", "published"].join(",");

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`${header}\n`));
      const pageSize = 250;
      let cursor: { id: string } | undefined;
      for (;;) {
        const rows = await prisma.olympiadResult.findMany({
          where: { olympiadId },
          include: {
            participant: {
              select: {
                firstName: true,
                lastName: true,
                gradeLabel: true,
                schoolName: true,
                region: true,
              },
            },
          },
          orderBy: [{ rank: "asc" }, { score: "desc" }, { id: "asc" }],
          take: pageSize,
          ...(cursor ? { skip: 1, cursor } : {}),
        });
        if (!rows.length) break;
        for (const r of rows) {
          const p = r.participant;
          const line = [
            r.rank ?? "",
            r.score ?? "",
            r.maxScore ?? "",
            csvEscape(p.firstName),
            csvEscape(p.lastName),
            csvEscape(p.gradeLabel),
            csvEscape(p.schoolName),
            csvEscape(p.region),
            r.published ? "1" : "0",
          ].join(",");
          controller.enqueue(encoder.encode(`${line}\n`));
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
