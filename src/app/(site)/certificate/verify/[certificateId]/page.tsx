import type { Metadata } from "next";
import Link from "next/link";
import { getCertificateVerification, looksLikeCertificateVerifyPublicId } from "@/lib/olympiad/certificate-service";
import { Card } from "@/components/ui/card";

type Props = { params: Promise<{ certificateId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { certificateId } = await params;
  const raw = certificateId.trim();
  if (!looksLikeCertificateVerifyPublicId(raw)) return { title: "Sertifikat topilmadi", robots: { index: false } };
  const v = await getCertificateVerification(raw);
  if (v.ok === false && v.reason === "not_found") return { title: "Sertifikat topilmadi", robots: { index: false } };
  if (v.ok === false && v.reason === "revoked") return { title: "Sertifikat bekor qilingan", robots: { index: false } };
  if (v.ok) return { title: "Sertifikat tekshiruvi", robots: { index: false } };
  return { title: "Sertifikat", robots: { index: false } };
}

export default async function CertificateVerifyPage({ params }: Props) {
  const { certificateId } = await params;
  const raw = certificateId.trim();
  if (!looksLikeCertificateVerifyPublicId(raw)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Card className="border-slate-200 p-8 text-center text-slate-800">
          <h1 className="text-xl font-bold">Sertifikat topilmadi</h1>
          <p className="mt-3 text-sm text-slate-600">ID formati noto‘g‘ri.</p>
        </Card>
      </div>
    );
  }
  const v = await getCertificateVerification(raw);

  if (v.ok === false && v.reason === "not_found") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Card className="border-slate-200 p-8 text-center text-slate-800">
          <h1 className="text-xl font-bold">Sertifikat topilmadi</h1>
          <p className="mt-3 text-sm text-slate-600">ID noto‘g‘ri yoki muddati o‘tgan.</p>
        </Card>
      </div>
    );
  }

  if (v.ok === false && v.reason === "revoked") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Card className="border-amber-200 bg-amber-50/80 p-8 text-center text-amber-950">
          <h1 className="text-xl font-bold">Sertifikat bekor qilingan</h1>
          <p className="mt-3 text-xs text-amber-900/80">ID: {v.verifyPublicId}</p>
          <p className="mt-2 text-sm">Bekor qilingan: {new Date(v.revokedAt).toLocaleString()}</p>
        </Card>
      </div>
    );
  }

  if (v.ok) {
    const pdfHref = `/api/certificate/pdf/${encodeURIComponent(v.verifyPublicId)}`;

    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Card className="border-emerald-100 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Rasmiy tekshiruv</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{v.olympiadTitle}</h1>
          <dl className="mt-6 space-y-2 text-sm text-slate-700">
            <div className="flex justify-between gap-4 border-b border-slate-100 py-2">
              <dt>Ishtirokchi</dt>
              <dd className="font-medium text-slate-900">{v.participantName}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-100 py-2">
              <dt>Ball foizi</dt>
              <dd className="font-medium">{v.scorePercent}%</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-100 py-2">
              <dt>Jami savol balli</dt>
              <dd className="font-medium">{v.maxScore ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-100 py-2">
              <dt>O‘rin</dt>
              <dd className="font-medium">{v.rank ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-100 py-2">
              <dt>Medal</dt>
              <dd className="font-medium">{v.medal}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-100 py-2">
              <dt>Sertifikat ID</dt>
              <dd className="break-all font-mono text-xs">{v.verifyPublicId}</dd>
            </div>
            {v.contentSha256 ? (
              <div className="flex flex-col gap-1 py-2">
                <dt className="text-slate-600">Kontent SHA-256</dt>
                <dd className="break-all font-mono text-xs text-slate-800">{v.contentSha256}</dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={pdfHref}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              PDF yuklab olish
            </Link>
            <Link href="/" className="text-sm font-medium text-emerald-700 hover:text-emerald-600">
              Bosh sahifa
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}
