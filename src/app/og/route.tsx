import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from "@/lib/og/dimensions";
import { renderBrandOg } from "@/lib/og/render-brand-og";

/** `next/og` Node da; edge marshrut ogohlantirishini bermaydi. */
export const runtime = "nodejs";

function clamp(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

/**
 * Ijtimoiy tarmoq preview rasmlari — `next/og` (1200×630).
 * Marshrut `/api` ostida emas (`robots.txt` da /api disallow) — skanerlar rasmni yuklay oladi.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawT = searchParams.get("t")?.trim();
  const rawS = searchParams.get("s")?.trim();

  const heading = rawT && rawT.length > 0 ? clamp(rawT, 96) : BRAND.name;
  let subtitle: string;
  if (rawS && rawS.length > 0) subtitle = clamp(rawS, 150);
  else if (rawT && rawT.length > 0) subtitle = BRAND.shortTagline;
  else subtitle = BRAND.tagline;

  return new ImageResponse(renderBrandOg(heading, subtitle), {
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    headers: {
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
