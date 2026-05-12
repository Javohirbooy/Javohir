import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { looksLikeCertificateVerifyPublicId } from "@/lib/olympiad/certificate-service";

export const dynamic = "force-dynamic";

/** PDF fayl — jamoat URL (verifyPublicId noyob). */
export async function GET(_req: Request, ctx: { params: Promise<{ certificateId: string }> }) {
  const { certificateId } = await ctx.params;
  const id = certificateId.trim().slice(0, 160);
  if (!looksLikeCertificateVerifyPublicId(id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const row = await prisma.olympiadCertificate.findFirst({
    where: { verifyPublicId: id },
    select: { pdfUrl: true, revokedAt: true },
  });
  if (!row?.pdfUrl) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (row.revokedAt) return NextResponse.json({ error: "revoked" }, { status: 410 });
  return NextResponse.redirect(row.pdfUrl, 302);
}
