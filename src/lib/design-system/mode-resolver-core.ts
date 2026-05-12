import { modeAccentFor } from "./colors";
import { surfaceClass } from "./surfaces";
import type { ThemeVariant, UiMode } from "./types";

/** Mode-only chrome tokens (no stress, no padding). */
export type ModeChromeTokens = {
  accentColor: string;
  mainSurfaceClass: string;
  shellBgClassName: string;
  useMonoFont: boolean;
};

const bgByMode: Record<UiMode, string> = {
  learning: "bg-gradient-to-b from-violet-50/90 via-white to-sky-50/80 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900",
  classroom: "bg-slate-50 dark:bg-slate-950",
  contest: "bg-slate-100 dark:bg-slate-950",
  coding: "bg-slate-950 text-slate-100",
};

/** Pure: mode + theme → static visual tokens. */
export function resolveModeChrome(mode: UiMode, theme: ThemeVariant): ModeChromeTokens {
  return {
    accentColor: modeAccentFor(mode, theme),
    mainSurfaceClass: surfaceClass(mode),
    shellBgClassName: bgByMode[mode],
    useMonoFont: mode === "coding",
  };
}
