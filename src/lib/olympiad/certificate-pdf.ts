import { createHash, randomBytes } from "crypto";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import { BRAND } from "@/lib/brand";
import { medalLabelUz, medalKeyFromRank } from "@/lib/olympiad/certificate-medal";

export type CertificatePdfInput = {
  siteUrl: string;
  verifyPublicId: string;
  participantName: string;
  olympiadTitle: string;
  scorePercent: number;
  maxScore: number;
  rank: number | null;
  completedAt: Date;
  organizationName?: string;
};

const FONT_DEFAULT =
  "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf";

export function generateCertificateVerifyPublicId(): string {
  return `cert_${randomBytes(18).toString("base64url")}`;
}

export async function buildOlympiadCertificatePdf(input: CertificatePdfInput): Promise<{ bytes: Uint8Array; sha256: string }> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const fontUrl = process.env.CERTIFICATE_FONT_TTF_URL?.trim() || FONT_DEFAULT;
  const fontRes = await fetch(fontUrl, { signal: AbortSignal.timeout(12_000) });
  if (!fontRes.ok) {
    throw new Error(`certificate.font_fetch_failed:${fontRes.status}`);
  }
  const fontBytes = await fontRes.arrayBuffer();
  const font = await pdfDoc.embedFont(fontBytes);

  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const margin = 48;
  let y = height - margin;

  const verifyUrl = `${input.siteUrl.replace(/\/$/, "")}/certificate/verify/${input.verifyPublicId}`;
  const qrPng = await QRCode.toBuffer(verifyUrl, { type: "png", margin: 1, width: 180 });
  const qrImage = await pdfDoc.embedPng(qrPng);

  const org = input.organizationName ?? BRAND.name;
  const medalKey = medalKeyFromRank(input.rank);
  const medal = medalLabelUz(medalKey);

  const lines: { text: string; size: number; bold?: boolean }[] = [
    { text: org, size: 11 },
    { text: "OLIMPIADA SERTIFIKATI", size: 18, bold: true },
    { text: "", size: 8 },
    { text: input.olympiadTitle, size: 14 },
    { text: "", size: 10 },
    { text: `Ishtirokchi: ${input.participantName}`, size: 12 },
    { text: `Foiz (ball): ${input.scorePercent}%`, size: 12 },
    { text: `Jami savol balli: ${input.maxScore}`, size: 11 },
    { text: `O‘rin: ${input.rank != null ? String(input.rank) : "—"}`, size: 12 },
    { text: `Medal: ${medal}`, size: 11 },
    { text: `Tugatilgan: ${input.completedAt.toISOString().slice(0, 10)}`, size: 11 },
    { text: `Sertifikat ID: ${input.verifyPublicId}`, size: 10 },
  ];

  for (const line of lines) {
    if (line.text === "") {
      y -= line.size;
      continue;
    }
    const fs = line.size;
    const textWidth = font.widthOfTextAtSize(line.text, fs);
    page.drawText(line.text, {
      x: (width - textWidth) / 2,
      y: y - fs,
      size: fs,
      font,
      color: rgb(0.1, 0.12, 0.16),
    });
    y -= fs + 6;
  }

  const qrSize = 120;
  page.drawImage(qrImage, {
    x: (width - qrSize) / 2,
    y: margin + 40,
    width: qrSize,
    height: qrSize,
  });
  const cap = "Tekshirish: QR yoki havola orqali autentifikatsiya";
  const cs = 9;
  const cw = font.widthOfTextAtSize(cap, cs);
  page.drawText(cap, {
    x: (width - cw) / 2,
    y: margin + 20,
    size: cs,
    font,
    color: rgb(0.35, 0.38, 0.42),
  });

  const bytes = await pdfDoc.save();
  const sha256 = createHash("sha256").update(Buffer.from(bytes)).digest("hex");
  return { bytes, sha256 };
}
