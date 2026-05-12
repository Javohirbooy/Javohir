import type { UiMode } from "@/lib/design-system/types";

/** After this window from `routeHintSetAt`, stored route hint is ignored (transition staleness). */
export const ROUTE_HINT_TTL_MS = 800;

export type EffectiveUiModeInput = {
  routeHint: UiMode | null;
  routeHintSetAt: number | null;
  preference: UiMode | null;
  systemLock: UiMode | null;
  /**
   * Current URL-derived mode — used when the stored hint is expired or absent.
   * Prevents falling back to `"classroom"` while still on e.g. `/learning`.
   */
  pathnameDerivedMode: UiMode;
};

function routeHintEffective(hint: UiMode | null, setAt: number | null, nowMs: number): UiMode | null {
  if (hint == null || setAt == null) return null;
  if (nowMs - setAt > ROUTE_HINT_TTL_MS) return null;
  return hint;
}

/**
 * Hybrid effective mode: systemLock > preference > fresh route hint > pathname fallback.
 * User preference never loses to route hint; pathname is only used when hint/TTL cannot decide.
 */
export function resolveEffectiveUiMode(state: EffectiveUiModeInput, nowMs: number): UiMode {
  if (state.systemLock != null) return state.systemLock;
  if (state.preference != null) return state.preference;
  const hint = routeHintEffective(state.routeHint, state.routeHintSetAt, nowMs);
  if (hint != null) return hint;
  return state.pathnameDerivedMode;
}

/** Pure selector — same as `resolveEffectiveUiMode`. */
export function selectEffectiveUiMode(state: EffectiveUiModeInput, nowMs: number): UiMode {
  return resolveEffectiveUiMode(state, nowMs);
}
