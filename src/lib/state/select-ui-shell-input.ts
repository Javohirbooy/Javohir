import type { PlatformRole, ThemeVariant, UiMode } from "@/lib/design-system/types";
import { resolveEffectiveUiMode } from "./effective-ui-mode";

/** Only fields read for mode resolution — no actions (keeps composer pure). */
export type UiModeComposeSlice = {
  routeHint: UiMode | null;
  routeHintSetAt: number | null;
  preference: UiMode | null;
  systemLock: UiMode | null;
};

/**
 * Single composition snapshot passed to `composeUiShell` — pure data, no store handles.
 * Built only via `selectUiShellComposeInput` from atomic snapshots + `nowMs`.
 */
export type UiShellComposeSnapshot = {
  stressScore: number;
  role: PlatformRole;
  mode: UiMode;
  theme: ThemeVariant;
};

type StressSlice = { score: number };
type RoleSlice = { role: PlatformRole };

/**
 * Pure selector: maps disconnected slices + clock into one immutable input for `composeUiShell`.
 * No store imports inside design-system — only this module bridges domain → composer.
 */
export function selectUiShellComposeInput(input: {
  stress: StressSlice;
  role: RoleSlice;
  uiMode: UiModeComposeSlice;
  theme: ThemeVariant;
  nowMs: number;
  pathnameDerivedMode: UiMode;
}): UiShellComposeSnapshot {
  const mode = resolveEffectiveUiMode(
    {
      routeHint: input.uiMode.routeHint,
      routeHintSetAt: input.uiMode.routeHintSetAt,
      preference: input.uiMode.preference,
      systemLock: input.uiMode.systemLock,
      pathnameDerivedMode: input.pathnameDerivedMode,
    },
    input.nowMs,
  );

  return {
    stressScore: input.stress.score,
    role: input.role.role,
    mode,
    theme: input.theme,
  };
}
