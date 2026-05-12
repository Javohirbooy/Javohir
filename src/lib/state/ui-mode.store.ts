import { create } from "zustand";
import type { UiMode } from "@/lib/design-system/types";

export type UiModeSliceState = {
  /** From URL segment — advisory; TTL applies via `routeHintSetAt`. */
  routeHint: UiMode | null;
  /** When `routeHint` was last written (performance.now or Date.now). */
  routeHintSetAt: number | null;
  /** User override; null = follow route hint / default. */
  preference: UiMode | null;
  /** System-forced mode (e.g. exam lock) — wins over preference + route. */
  systemLock: UiMode | null;
  /** Bumped when route-hint TTL should be re-evaluated (timer after navigation). */
  routeHintTtlNonce: number;
  setRouteHint: (m: UiMode | null) => void;
  setPreference: (m: UiMode | null) => void;
  clearPreference: () => void;
  setSystemLock: (m: UiMode | null) => void;
  bumpRouteHintTtl: () => void;
};

/**
 * Route + preference + system — no stress, no role.
 */
export const useUiModeStore = create<UiModeSliceState>((set) => ({
  routeHint: null,
  routeHintSetAt: null,
  preference: null,
  systemLock: null,
  routeHintTtlNonce: 0,
  setRouteHint: (routeHint) =>
    set({
      routeHint,
      routeHintSetAt: Date.now(),
    }),
  setPreference: (preference) => set({ preference }),
  clearPreference: () => set({ preference: null }),
  setSystemLock: (systemLock) => set({ systemLock }),
  bumpRouteHintTtl: () => set((s) => ({ routeHintTtlNonce: s.routeHintTtlNonce + 1 })),
}));
