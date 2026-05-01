import type { AppLocale } from "@/lib/i18n/constants";
import { DEFAULT_LOCALE } from "@/lib/i18n/constants";
import { messages } from "@/lib/i18n/messages";

export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export function difficultyLabel(code: string, locale: AppLocale = DEFAULT_LOCALE): string {
  const d = messages[locale]?.difficulty ?? messages.uz.difficulty;
  if (code === "EASY" || code === "MEDIUM" || code === "HARD") return d[code];
  return code;
}

export function difficultyBadgeClass(code: string): string {
  switch (code) {
    case "EASY":
      return "border-emerald-400/40 bg-emerald-500/15 text-emerald-100";
    case "HARD":
      return "border-rose-400/40 bg-rose-500/15 text-rose-100";
    default:
      return "border-amber-400/40 bg-amber-500/15 text-amber-100";
  }
}
