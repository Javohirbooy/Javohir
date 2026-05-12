"use client";

import { useEffect, useLayoutEffect, useMemo, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { UiMode } from "@/lib/design-system/types";
import { ROUTE_HINT_TTL_MS } from "@/lib/state/effective-ui-mode";
import { deriveRouteModeFromPath } from "@/lib/state/derive-route-mode";
import { useUiModeStore } from "@/lib/state/ui-mode.store";
import { useEffectiveUiMode } from "@/lib/state/use-resolved-ui-shell";
import { PlatformAppShell } from "@/components/layout/platform-app-shell";
import { EventBusScopeProvider } from "@/components/providers/event-bus-scope";

/** Syncs route hint + TTL refresh tick — pathname fallback in resolver prevents stuck classroom after TTL. */
function RouteHintSync({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const setRouteHint = useUiModeStore((s) => s.setRouteHint);
  const bumpRouteHintTtl = useUiModeStore((s) => s.bumpRouteHintTtl);

  useLayoutEffect(() => {
    setRouteHint(deriveRouteModeFromPath(pathname));
  }, [pathname, setRouteHint]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      bumpRouteHintTtl();
    }, ROUTE_HINT_TTL_MS + 5);
    return () => window.clearTimeout(id);
  }, [pathname, bumpRouteHintTtl]);

  return <>{children}</>;
}

function ShellWithTitles({ children }: { children: ReactNode }) {
  const effectiveMode = useEffectiveUiMode();
  const meta = useMemo(() => {
    const m: Record<UiMode, { title: string; subtitle: string }> = {
      learning: {
        title: "Learning",
        subtitle: "Streak, XP va bosqichma-bosqich o‘rganish — motivatsiya ustun.",
      },
      classroom: {
        title: "Classroom",
        subtitle: "Kurslar, topshiriqlar va materiallar — tuzilmali o‘qitish.",
      },
      contest: {
        title: "Contest",
        subtitle: "Jonli reyting, muammolar va qat’iy vaqt — raqobatbardosh muhit.",
      },
      coding: {
        title: "Workspace",
        subtitle: "IDE tartibi, testlar va submit — kod muhiti.",
      },
    };
    return m[effectiveMode];
  }, [effectiveMode]);

  return (
    <PlatformAppShell title={meta.title} subtitle={meta.subtitle}>
      {children}
    </PlatformAppShell>
  );
}

/** Route-group layout: scoped realtime bus destroyed on unmount; hybrid UI mode + route-hint TTL. */
export function EduPlatformGroupLayout({ children }: { children: ReactNode }) {
  return (
    <EventBusScopeProvider>
      <RouteHintSync>
        <ShellWithTitles>{children}</ShellWithTitles>
      </RouteHintSync>
    </EventBusScopeProvider>
  );
}
