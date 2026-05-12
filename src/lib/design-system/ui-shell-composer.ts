import { cn } from "@/lib/utils";
import type { PlatformRole, ThemeVariant, UiDensity, UiMode } from "./types";
import { decideStressLayout, type StressLayoutDecision } from "./stress-decider";
import { resolveModeChrome, type ModeChromeTokens } from "./mode-resolver-core";
import type { UiShellComposeSnapshot } from "@/lib/state/select-ui-shell-input";

export type ResolvedUiShell = ModeChromeTokens &
  StressLayoutDecision & {
    mode: UiMode;
    role: PlatformRole;
    theme: ThemeVariant;
    stressScore: number;
    /** Root wrapper — page background + density rhythm */
    shellClassName: string;
  };

const densityPadding: Record<UiDensity, string> = {
  comfortable: "gap-4 p-4 sm:gap-6 sm:p-6 lg:p-8",
  compact: "gap-3 p-3 sm:gap-4 sm:p-4 lg:p-6",
  ultra: "gap-2 p-2 sm:gap-3 sm:p-3 lg:p-4",
};

/**
 * Pure composition: accepts only `UiShellComposeSnapshot` (no store handles).
 */
export function composeUiShell(snapshot: UiShellComposeSnapshot): ResolvedUiShell {
  const stress = decideStressLayout(snapshot.stressScore);
  const chrome = resolveModeChrome(snapshot.mode, snapshot.theme);
  const shellClassName = cn(
    "min-h-[100dvh] min-h-screen",
    chrome.shellBgClassName,
    densityPadding[stress.density],
    chrome.useMonoFont && "font-mono",
  );

  return {
    mode: snapshot.mode,
    role: snapshot.role,
    theme: snapshot.theme,
    stressScore: snapshot.stressScore,
    shellClassName,
    ...stress,
    ...chrome,
  };
}

/** @deprecated Use composeUiShell — alias for backwards compatibility. */
export const resolveUiShell = composeUiShell;
