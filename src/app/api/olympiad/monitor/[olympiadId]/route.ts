import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { assertOlympiadMonitorAccess } from "@/lib/olympiad/authz";
import { getOlympiadMonitorSnapshot } from "@/lib/olympiad/monitor-snapshot";

export async function GET(req: Request, ctx: { params: Promise<{ olympiadId: string }> }) {
  const session = await auth();
  const { olympiadId } = await ctx.params;
  try {
    await assertOlympiadMonitorAccess(session, olympiadId);
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const limRaw = Number(url.searchParams.get("limit") ?? "120");
  const takeSessions = Number.isFinite(limRaw) ? Math.min(200, Math.max(20, Math.floor(limRaw))) : 120;
  const violRaw = Number(url.searchParams.get("violationLimit") ?? "6");
  const takeViolations = Number.isFinite(violRaw) ? Math.min(20, Math.max(0, Math.floor(violRaw))) : 6;
  const cursor = url.searchParams.get("cursor")?.trim() || null;

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
