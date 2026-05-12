import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { assertOlympiadMonitorAccess } from "@/lib/olympiad/authz";
import { prisma } from "@/lib/prisma";
import { sha256HexUtf8, verifySubmissionIntegrityV1 } from "@/lib/olympiad/submission-integrity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Admin/monitor: sessiya natijasining HMAC yaxlitligini tekshiradi.
 * GET ?sessionId=...
 */
export async function GET(req: Request, ctx: { params: Promise<{ olympiadId: string }> }) {
  const session = await auth();
  const { olympiadId } = await ctx.params;
  try {
    await assertOlympiadMonitorAccess(session, olympiadId);
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sessionId = new URL(req.url).searchParams.get("sessionId")?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId_required" }, { status: 400 });
  }

  const result = await prisma.olympiadResult.findUnique({
    where: { sessionId },
    select: {
      olympiadId: true,
      participantId: true,
      sessionId: true,
      score: true,
      maxScore: true,
      answersJson: true,
      finalizedAt: true,
      createdAt: true,
      submissionIntegritySig: true,
      submissionCanonicalSha256: true,
    },
  });

  if (!result || result.olympiadId !== olympiadId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!result.submissionIntegritySig || !result.submissionCanonicalSha256) {
    return NextResponse.json({
      ok: true,
      valid: false,
      reason: "unsigned",
      sessionId: result.sessionId,
    });
  }

  const finalizedAtIso = result.finalizedAt?.toISOString() ?? result.createdAt.toISOString();
  const answersJson = result.answersJson ?? "[]";
  const valid = verifySubmissionIntegrityV1(
    {
      v: 1,
      sessionId: result.sessionId,
      olympiadId: result.olympiadId,
      participantId: result.participantId,
      score: result.score ?? 0,
      maxScore: result.maxScore ?? 0,
      answersSha256: sha256HexUtf8(answersJson),
      finalizedAtIso,
    },
    result.submissionIntegritySig,
    result.submissionCanonicalSha256,
  );

  return NextResponse.json({
    ok: true,
    valid,
    sessionId: result.sessionId,
    canonicalSha256: result.submissionCanonicalSha256,
    answersSha256: sha256HexUtf8(answersJson),
  });
}
