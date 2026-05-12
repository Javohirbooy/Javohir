import type { UiMode } from "./types";
import { cn } from "@/lib/utils";

/** Glass (learning), sharp (contest), clean (classroom), IDE chrome (coding). */
export const surfacePresets = {
  glass: "rounded-2xl border border-white/25 bg-white/75 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/65",
  sharp: "rounded-md border border-slate-300 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-950",
  clean: "rounded-xl border border-slate-200/90 bg-white shadow-md dark:border-slate-700 dark:bg-slate-900",
  ide: "rounded-lg border border-slate-800 bg-slate-950 text-slate-100 shadow-inner",
} as const;

export type SurfaceKey = keyof typeof surfacePresets;

export function surfaceForMode(mode: UiMode): SurfaceKey {
  switch (mode) {
    case "learning":
      return "glass";
    case "classroom":
      return "clean";
    case "contest":
      return "sharp";
    case "coding":
      return "ide";
  }
}

export function surfaceClass(mode: UiMode, extra?: string): string {
  return cn(surfacePresets[surfaceForMode(mode)], extra);
}
