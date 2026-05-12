import { wrapRouteHandlerWithSentry } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getCertificateVerification, looksLikeCertificateVerifyPublicId } from "@/lib/olympiad/certificate-service";
import { takeRateLimitSlot } from "@/lib/distributed-rate-limit";
import { isStrictDistributedRateLimitPolicy } from "@/lib/redis-strict-policy";
import { getClientIpFromHeaders, getRequestIdFromHeaders } from "@/lib/request-context";
import { hashIp } from "@/lib/olympiad/ip-fp";
import { OLYMPIAD_CERT_VERIFY_RATE_MAX, OLYMPIAD_CERT_VERIFY_RATE_WINDOW_MS } from "@/lib/olympiad/constants";
import { slightTimingJitter } from "@/lib/security-timing";

export const dynamic = "force-dynamic";

async function getImpl(_req: Request, ctx: { params: Promise<{ certificateId: string }> }) {
  const { certificateId: rawId } = await ctx.params;
  const certificateId = rawId.trim().slice(0, 160);

  const ip = await getClientIpFromHeaders();
  const requestId = await getRequestIdFromHeaders();
  const rl = await takeRateLimitSlot(
    "certificate_verify",
    hashIp(ip),
    OLYMPIAD_CERT_VERIFY_RATE_MAX,
    OLYMPIAD_CERT_VERIFY_RATE_WINDOW_MS,
    { requireDistributed: isStrictDistributedRateLimitPolicy(), requestId },
  );
  if (!rl.ok) {
    await slightTimingJitter();
    return NextResponse.json({ valid: false, reason: "rate_limited" }, { status: 429 });
  }

  if (!looksLikeCertificateVerifyPublicId(certificateId)) {
    await slightTimingJitter();
    return NextResponse.json({ valid: false, reason: "not_found" }, { status: 404 });
  }

  const v = await getCertificateVerification(certificateId);
  await slightTimingJitter();

  if (v.ok === false && v.reason === "not_found") {
    return NextResponse.json({ valid: false, reason: "not_found" }, { status: 404 });
  }
  if (v.ok === false && v.reason === "revoked") {
    return NextResponse.json({
      valid: false,
      revoked: true,
      verifyPublicId: v.verifyPublicId,
      revokedAt: v.revokedAt,
    });
  }
  if (v.ok) {
    return NextResponse.json({
      valid: true,
      verifyPublicId: v.verifyPublicId,
      olympiadTitle: v.olympiadTitle,
      participantName: v.participantName,
      scorePercent: v.scorePercent,
      maxScore: v.maxScore,
      rank: v.rank,
      medal: v.medal,
      issuedAt: v.issuedAt,
      contentSha256: v.contentSha256,
    });
  }
  return NextResponse.json({ valid: false, reason: "unknown" }, { status: 500 });
}

export const GET = wrapRouteHandlerWithSentry(getImpl, {
  method: "GET",
  parameterizedRoute: "/api/certificate/verify/[certificateId]",
});
