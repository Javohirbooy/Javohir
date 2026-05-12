import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/env";
import { medalKeyFromRank, medalLabelUz } from "@/lib/olympiad/certificate-medal";
import { buildOlympiadCertificatePdf, generateCertificateVerifyPublicId } from "@/lib/olympiad/certificate-pdf";
import { logStructured } from "@/lib/logger";

/** Jamoat tekshiruvi ID formati (`cert_` + base64url); noto‘g‘ri formatlar DBga tegmasdan rad etiladi. */
export function looksLikeCertificateVerifyPublicId(raw: string): boolean {
  const id = raw.trim();
  return /^cert_[A-Za-z0-9_-]{12,128}$/.test(id);
}

export type CertificateVerificationDTO =
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "revoked"; verifyPublicId: string; revokedAt: string }
  | {
      ok: true;
      verifyPublicId: string;
      olympiadTitle: string;
      participantName: string;
      scorePercent: number;
      maxScore: number | null;
      rank: number | null;
      medal: string;
      issuedAt: string | null;
      contentSha256: string | null;
    };

export async function getCertificateVerification(verifyPublicId: string): Promise<CertificateVerificationDTO> {
  const row = await prisma.olympiadCertificate.findFirst({
    where: { verifyPublicId },
    include: {
      result: {
        include: {
          olympiad: { select: { title: true } },
          participant: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!row || !row.verifyPublicId) return { ok: false, reason: "not_found" };
  if (row.revokedAt) {
    return {
      ok: false,
      reason: "revoked",
      verifyPublicId: row.verifyPublicId,
      revokedAt: row.revokedAt.toISOString(),
    };
  }
  const p = row.result.participant;
  const medal = medalLabelUz(medalKeyFromRank(row.result.rank));
  return {
    ok: true,
    verifyPublicId: row.verifyPublicId,
    olympiadTitle: row.result.olympiad.title,
    participantName: `${p.firstName} ${p.lastName}`.trim(),
    scorePercent: row.result.score ?? 0,
    maxScore: row.result.maxScore,
    rank: row.result.rank,
    medal,
    issuedAt: row.issuedAt?.toISOString() ?? null,
    contentSha256: row.contentSha256,
  };
}

export async function issueCertificatesForOlympiad(olympiadId: string): Promise<{ issued: number; failed: number; total: number }> {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    throw new Error("BLOB_READ_WRITE_TOKEN sozlanmagan — PDF yuklash mumkin emas.");
  }

  const siteUrl = getSiteUrl();
  let issued = 0;
  let errors = 0;
  let total = 0;
  const pageSize = 200;
  let cursor: { id: string } | undefined;

  for (;;) {
    const results = await prisma.olympiadResult.findMany({
      where: {
        olympiadId,
        published: true,
      },
      include: {
        participant: true,
        olympiad: { select: { title: true } },
        certificate: true,
      },
      orderBy: { id: "asc" },
      take: pageSize,
      ...(cursor ? { skip: 1, cursor } : {}),
    });
    if (!results.length) break;

    const targets = results.filter((r) => !r.certificate || !r.certificate.pdfUrl);
    total += targets.length;

    for (const r of targets) {
      try {
        const existing = r.certificate;
        const verifyPublicId = existing?.verifyPublicId ?? generateCertificateVerifyPublicId();
        const completedAt = r.finalizedAt ?? r.approvedAt ?? r.createdAt;
        const participantName = `${r.participant.firstName} ${r.participant.lastName}`.trim();
        const { bytes, sha256 } = await buildOlympiadCertificatePdf({
          siteUrl,
          verifyPublicId,
          participantName,
          olympiadTitle: r.olympiad.title,
          scorePercent: r.score ?? 0,
          maxScore: r.maxScore ?? 0,
          rank: r.rank,
          completedAt,
        });

        const path = `olympiad-certs/${verifyPublicId}.pdf`;
        const uploaded = await put(path, Buffer.from(bytes), {
          access: "public",
          token: process.env.BLOB_READ_WRITE_TOKEN!,
          contentType: "application/pdf",
        });

        const medal = medalKeyFromRank(r.rank);

        if (existing) {
          await prisma.olympiadCertificate.update({
            where: { id: existing.id },
            data: {
              verifyPublicId,
              pdfUrl: uploaded.url,
              contentSha256: sha256,
              issuedAt: new Date(),
              medal,
              metaJson: JSON.stringify({ version: 1, regeneratedAt: new Date().toISOString() }),
            },
          });
        } else {
          await prisma.olympiadCertificate.create({
            data: {
              resultId: r.id,
              verifyPublicId,
              pdfUrl: uploaded.url,
              contentSha256: sha256,
              issuedAt: new Date(),
              medal,
              templateKey: "default-v1",
              metaJson: JSON.stringify({ version: 1 }),
            },
          });
        }
        issued += 1;
      } catch (e) {
        errors += 1;
        logStructured("error", "olympiad.certificate.issue_failed", {
          resultId: r.id,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }

    cursor = { id: results[results.length - 1]!.id };
    if (results.length < pageSize) break;
  }

  return { issued, failed: errors, total };
}

export async function revokeCertificateByVerifyId(
  verifyPublicId: string,
  olympiadId: string,
  actorUserId: string,
  reason: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = await prisma.olympiadCertificate.findFirst({
    where: { verifyPublicId },
    select: {
      id: true,
      metaJson: true,
      result: { select: { olympiadId: true } },
    },
  });
  if (!row) return { ok: false, error: "Topilmadi." };
  if (row.result.olympiadId !== olympiadId) return { ok: false, error: "Olimpiadaga tegishli emas." };
  let meta: Record<string, unknown> = {};
  try {
    meta = JSON.parse(row.metaJson) as Record<string, unknown>;
  } catch {
    meta = {};
  }
  meta.revokedByUserId = actorUserId;
  meta.revokedAt = new Date().toISOString();
  await prisma.olympiadCertificate.update({
    where: { id: row.id },
    data: {
      revokedAt: new Date(),
      revokeReason: reason.slice(0, 500),
      metaJson: JSON.stringify(meta),
    },
  });
  return { ok: true };
}
