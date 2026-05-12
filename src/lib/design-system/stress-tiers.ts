import type { StressTier, UiDensity, MotionPreset } from "./types";

export function stressScoreToTier(score: number): StressTier {
  const s = Math.max(0, Math.min(100, score));
  if (s < 30) return "relaxed";
  if (s < 60) return "normal";
  if (s < 80) return "focused";
  return "hardcore";
}

export function tierToDensity(tier: StressTier): UiDensity {
  switch (tier) {
    case "relaxed":
      return "comfortable";
    case "normal":
      return "comfortable";
    case "focused":
      return "compact";
    case "hardcore":
      return "ultra";
  }
}

export function tierToMotion(tier: StressTier): MotionPreset {
  switch (tier) {
    case "relaxed":
      return "smooth";
    case "normal":
      return "smooth";
    case "focused":
      return "minimal";
    case "hardcore":
      return "competitive";
  }
}

/** Whether to show marketing-grade decoration (blobs, secondary nav). */
export function tierShowDecorations(tier: StressTier): boolean {
  return tier === "relaxed" || tier === "normal";
}

export function tierReduceChrome(tier: StressTier): boolean {
  return tier === "focused" || tier === "hardcore";
}
