import { SertifikatniTekshirishClient } from "./client";

type PageProps = { searchParams: Promise<{ id?: string | string[] }> };

export default async function SertifikatniTekshirishPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const raw = sp.id;
  const initialId = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";

  return <SertifikatniTekshirishClient initialId={initialId} />;
}
