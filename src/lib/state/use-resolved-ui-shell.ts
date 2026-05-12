"use client";

import { useCallback, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import type { PlatformRole, ThemeVariant, UiMode } from "@/lib/design-system/types";
import { composeUiShell, type ResolvedUiShell } from "@/lib/design-system/ui-shell-composer";
import {
  selectUiShellComposeInput,
  type UiShellComposeSnapshot,
  type UiModeComposeSlice,
} from "@/lib/state/select-ui-shell-input";
import { resolveEffectiveUiMode } from "@/lib/state/effective-ui-mode";
import { useRoleStore } from "@/lib/state/role.store";
import { useStressStore } from "@/lib/state/stress.store";
import { useUiModeStore } from "@/lib/state/ui-mode.store";
import { deriveRouteModeFromPath } from "@/lib/state/derive-route-mode";

function shellComposeSnapshotShallowEqual(a: UiShellComposeSnapshot, b: UiShellComposeSnapshot): boolean {
  return (
    a.stressScore === b.stressScore &&
    a.role === b.role &&
    a.mode === b.mode &&
    a.theme === b.theme
  );
}

function themeFromNext(resolvedTheme: string | undefined): ThemeVariant {
  if (resolvedTheme === "dark") return "dark";
  if (resolvedTheme === "light") return "light";
  return "hybrid";
}

export function useThemeVariant(): ThemeVariant {
  const { resolvedTheme } = useTheme();
  return useMemo(() => themeFromNext(resolvedTheme), [resolvedTheme]);
}

/** Stress only — does not subscribe to mode/role. */
export function useStressScoreOnly(): number {
  return useStressStore((s) => s.score);
}

export function useRoleOnly(): PlatformRole {
  return useRoleStore((s) => s.role);
}

/** Navigation-driven mode slice — stress updates do not touch this object unless route fields change. */
export function useUiModeComposeSlice(): UiModeComposeSlice & { routeHintTtlNonce: number } {
  const routeHint = useUiModeStore((s) => s.routeHint);
  const routeHintSetAt = useUiModeStore((s) => s.routeHintSetAt);
  const preference = useUiModeStore((s) => s.preference);
  const systemLock = useUiModeStore((s) => s.systemLock);
  const routeHintTtlNonce = useUiModeStore((s) => s.routeHintTtlNonce);

  return useMemo(
    () => ({
      routeHint,
      routeHintSetAt,
      preference,
      systemLock,
      routeHintTtlNonce,
    }),
    [routeHint, routeHintSetAt, preference, systemLock, routeHintTtlNonce],
  );
}

/**
 * Effective UI mode only — stress updates do not rerender subscribers of this hook.
 */
export function useEffectiveUiMode(): UiMode {
  const pathname = usePathname();
  const pathnameDerivedMode = useMemo(() => deriveRouteModeFromPath(pathname), [pathname]);
  const slice = useUiModeComposeSlice();
  return useMemo(() => {
    // eslint-disable-next-line react-hooks/purity -- wall clock for route-hint TTL (client composition boundary)
    const nowMs = Date.now();
    return resolveEffectiveUiMode(
      {
        routeHint: slice.routeHint,
        routeHintSetAt: slice.routeHintSetAt,
        preference: slice.preference,
        systemLock: slice.systemLock,
        pathnameDerivedMode,
      },
      nowMs,
    );
  }, [slice, pathnameDerivedMode]);
}

export type UiShellLegacy = {
  mode: UiMode;
  role: PlatformRole;
  stressScore: number;
  resolved: ResolvedUiShell;
  setMode: (m: UiMode) => void;
  setRole: (r: PlatformRole) => void;
  setStressScore: (n: number) => void;
};

/**
 * Single snapshot → `composeUiShell`. Store slices merged only via `selectUiShellComposeInput` (pure).
 */
export function useResolvedUiShell(): {
  resolved: ResolvedUiShell;
  snapshot: UiShellComposeSnapshot;
  effectiveMode: UiMode;
  role: PlatformRole;
  stressScore: number;
  theme: ThemeVariant;
} {
  const pathname = usePathname();
  const pathnameDerivedMode = useMemo(() => deriveRouteModeFromPath(pathname), [pathname]);
  const stressScore = useStressScoreOnly();
  const role = useRoleOnly();
  const theme = useThemeVariant();
  const modeSlice = useUiModeComposeSlice();

  const snapshotNext = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity -- wall clock for route-hint TTL (client composition boundary)
    const nowMs = Date.now();
    return selectUiShellComposeInput({
      stress: { score: stressScore },
      role: { role },
      uiMode: {
        routeHint: modeSlice.routeHint,
        routeHintSetAt: modeSlice.routeHintSetAt,
        preference: modeSlice.preference,
        systemLock: modeSlice.systemLock,
      },
      theme,
      nowMs,
      pathnameDerivedMode,
    });
  }, [stressScore, role, theme, modeSlice, pathnameDerivedMode]);

  const snapshotRef = useRef(snapshotNext);
  if (!shellComposeSnapshotShallowEqual(snapshotRef.current, snapshotNext)) {
    snapshotRef.current = snapshotNext;
  }
  const snapshot = snapshotRef.current;

  const resolved = useMemo(() => composeUiShell(snapshot), [snapshot]);

  return {
    resolved,
    snapshot,
    effectiveMode: snapshot.mode,
    role,
    stressScore,
    theme,
  };
}

export function useUiShell(): UiShellLegacy {
  const { resolved, effectiveMode, role, stressScore } = useResolvedUiShell();

  const setMode = useCallback((m: UiMode) => {
    useUiModeStore.getState().setPreference(m);
  }, []);

  const setRole = useCallback((r: PlatformRole) => {
    useRoleStore.getState().setRole(r);
  }, []);

  const setStressScore = useCallback((n: number) => {
    useStressStore.getState().setScore(n);
  }, []);

  return useMemo(
    () => ({
      mode: effectiveMode,
      role,
      stressScore,
      resolved,
      setMode,
      setRole,
      setStressScore,
    }),
    [effectiveMode, resolved, role, stressScore, setMode, setRole, setStressScore],
  );
}
