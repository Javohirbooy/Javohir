import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertOlympiadMonitorAccess } from "@/lib/olympiad/authz";

const DISCONNECT_MS = 45_000;

export async function GET(_req: Request, ctx: { params: Promise<{ olympiadId: string }> }) {
  const session = await auth();
  const { olympiadId } = await ctx.params;
  try {
    await assertOlympiadMonitorAccess(session, olympiadId);
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const now = Date.now();
  const rows = await prisma.olympiadSession.findMany({
    where: { olympiadId },
    include: {
      participant: { select: { firstName: true, lastName: true, gradeLabel: true } },
      violations: { orderBy: { createdAt: "desc" }, take: 8 },
    },
    orderBy: { lastSeenAt: "desc" },
    take: 500,
  });

  const participants = rows.map((r) => {
    const disconnected = now - r.lastSeenAt.getTime() > DISCONNECT_MS;
    let status: "active" | "disconnected" | "suspicious" = "active";
    if (disconnected && (r.status === "ACTIVE" || r.status === "WAITING")) {
      status = "disconnected";
    }
    if (r.suspiciousScore >= 8 || r.warningCount >= 8) {
      status = "suspicious";
    }
    return {
      sessionId: r.id,
      status,
      participant: r.participant,
      sessionStatus: r.status,
      warningCount: r.warningCount,
      suspiciousScore: r.suspiciousScore,
      lastSeenAt: r.lastSeenAt.toISOString(),
      serverEndsAt: r.serverEndsAt?.toISOString() ?? null,
      submittedAt: r.submittedAt?.toISOString() ?? null,
      violations: r.violations.map((v) => ({
        type: v.type,
        at: v.createdAt.toISOString(),
      })),
    };
  });

  const olympiad = await prisma.olympiad.findUnique({
    where: { id: olympiadId },
    select: {
      title: true,
      startsAt: true,
      endsAt: true,
      status: true,
      durationMinutes: true,
      resultsPublishedAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    serverNow: new Date().toISOString(),
    olympiad,
    participants,
  });
}
