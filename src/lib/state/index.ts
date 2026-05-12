export type { PlatformRole, UiMode, StressTier } from "@/lib/design-system/types";
export {
  resolveEffectiveUiMode,
  selectEffectiveUiMode,
  ROUTE_HINT_TTL_MS,
  type EffectiveUiModeInput,
} from "./effective-ui-mode";
export { deriveRouteModeFromPath } from "./derive-route-mode";
export {
  selectUiShellComposeInput,
  type UiShellComposeSnapshot,
  type UiModeComposeSlice,
} from "./select-ui-shell-input";
export { useStressStore } from "./stress.store";
export { useRoleStore } from "./role.store";
export { useUiModeStore } from "./ui-mode.store";
export type { UiModeSliceState } from "./ui-mode.store";
export {
  useResolvedUiShell,
  useUiShell,
  useStressScoreOnly,
  useRoleOnly,
  useUiModeComposeSlice,
  useEffectiveUiMode,
  useThemeVariant,
} from "./use-resolved-ui-shell";
export type { UiShellLegacy } from "./use-resolved-ui-shell";
