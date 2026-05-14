import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { assertOlympiadMonitorAccess } from "@/lib/olympiad/authz";
import { getOlympiadMonitorSnapshot } from "@/lib/olympiad/monitor-snapshot";
import { olympiadIdParamSchema, olympiadMonitorGetQuerySchema } from "@/lib/olympiad/schemas";

export async function GET(req: Request, ctx: { params: Promise<{ olympiadId: string }> }) {
  const session = await auth();
  const rawParams = await ctx.params;
  const idParsed = olympiadIdParamSchema.safeParse(rawParams.olympiadId);
  if (!idParsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_params" }, { status: 400 });
  }
  const olympiadId = idParsed.data;
  try {
    await assertOlympiadMonitorAccess(session, olympiadId);
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const parsed = olympiadMonitorGetQuerySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
    violationLimit: url.searchParams.get("violationLimit") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_query", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { limit: takeSessions, violationLimit: takeViolations, cursor } = parsed.data;

  const snap = await getOlympiadMonitorSnapshot({
    olympiadId,
    takeSessions,
    takeViolations,
    cursor,
  });

  return NextResponse.json({
    ok: true,
    serverNow: snap.serverNow,
    olympiad: snap.olympiad,
    participants: snap.participants,
    pagination: snap.pagination,
  });
}
