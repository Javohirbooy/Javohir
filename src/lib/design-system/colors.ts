import type { ThemeVariant, UiMode } from "./types";

/** Raw semantic palette — pair with Tailwind at call sites or CSS variables. */
export const semanticColors = {
  primary: { light: "#2563eb", dark: "#60a5fa", hybrid: "#4F7CFF" },
  success: { light: "#16a34a", dark: "#4ade80", hybrid: "#22C55E" },
  warning: { light: "#d97706", dark: "#fbbf24", hybrid: "#F59E0B" },
  danger: { light: "#dc2626", dark: "#f87171", hybrid: "#EF4444" },
  surface: { light: "#f8fafc", dark: "#0f172a", hybrid: "#0b1220" },
  elevated: { light: "#ffffff", dark: "#1e293b", hybrid: "#121c2f" },
  border: { light: "#e2e8f0", dark: "#334155", hybrid: "rgba(148,163,184,0.35)" },
} as const;

/** Mode accent — used for nav keyline + focus rings. */
export const modeAccent: Record<UiMode, { light: string; dark: string; hybrid: string }> = {
  learning: { light: "#7c3aed", dark: "#a78bfa", hybrid: "#8b5cf6" },
  classroom: { light: "#0d9488", dark: "#2dd4bf", hybrid: "#14b8a6" },
  contest: { light: "#1d4ed8", dark: "#38bdf8", hybrid: "#3b82f6" },
  coding: { light: "#15803d", dark: "#4ade80", hybrid: "#22c55e" },
};

export function pickThemeColor<T extends Record<ThemeVariant, string>>(row: T, theme: ThemeVariant): string {
  return row[theme];
}

export function modeAccentFor(mode: UiMode, theme: ThemeVariant): string {
  return modeAccent[mode][theme];
}
