import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from "@/lib/og/dimensions";

const OG_ROUTE = "/og";

function truncate(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

export type OgImageQueryInput = {
  /** Asosiy sarlavha (OG rasm ustida) */
  title: string;
  /** Ikkinchi qator — ixtiyoriy */
  subtitle?: string;
};

/**
 * Metadata uchun nisbiy URL (`metadataBase` bilan mutlaq URL ga aylanadi).
 * Kelajakdagi marshrutlar: shu helperni chaqirib `openGraph.images` / `twitter.images` ga qo‘shing.
 */
export function buildOgImagePath(input: OgImageQueryInput): string {
  const q = new URLSearchParams();
  q.set("t", truncate(input.title, 90));
  const sub = input.subtitle?.trim();
  if (sub) q.set("s", truncate(sub, 140));
  return `${OG_ROUTE}?${q.toString()}`;
}

/** `metadata.openGraph.images` / `twitter` uchun tayyor obyekt (nisbiy `url`). */
export function buildOgImageMetadataEntry(input: OgImageQueryInput, alt: string) {
  const url = buildOgImagePath(input);
  return {
    url,
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    alt: truncate(alt, 120),
  } as const;
}
