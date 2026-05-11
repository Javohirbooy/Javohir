import type { ReactElement } from "react";
import { BRAND } from "@/lib/brand";
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from "@/lib/og/dimensions";

/**
 * `next/og` ImageResponse uchun markup — tashqi shrift fetch talab qilmaydi
 * (Telegram / Discord / Facebook / Twitter bilan mos).
 */
export function renderBrandOg(heading: string, subtitle?: string): ReactElement {
  const sub = subtitle?.trim();
  return (
    <div
      style={{
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        background: "linear-gradient(135deg, #022c22 0%, #0f766e 42%, #0e7490 100%)",
        color: "#ecfdf5",
        fontFamily: 'ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span
          style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#6ee7b7",
          }}
        >
          {BRAND.name}
        </span>
        <span style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1, maxWidth: 1040 }}>{heading}</span>
      </div>
      {sub ? (
        <span style={{ fontSize: 30, lineHeight: 1.35, color: "#ccfbf1", maxWidth: 1040, opacity: 0.95 }}>{sub}</span>
      ) : (
        <span style={{ fontSize: 30, lineHeight: 1.35, color: "#99f6e4", opacity: 0.85 }}>{BRAND.shortTagline}</span>
      )}
    </div>
  );
}
