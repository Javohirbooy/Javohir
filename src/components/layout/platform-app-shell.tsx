"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo, useEffect, useId, useRef } from "react";
import { useResolvedUiShell } from "@/lib/state/use-resolved-ui-shell";
import { eduTypography } from "@/lib/design-system/typography";
import { cn } from "@/lib/utils";
import { BookOpen, Code2, GraduationCap, Trophy } from "lucide-react";
import { StressTierIndicator } from "@/components/shared/stress-tier-indicator";
import { LiveConnectionStatus } from "@/components/shared/live-connection-status";

const nav = [
  { href: "/platform", label: "Hub", icon: GraduationCap },
  { href: "/learning", label: "Learning", icon: BookOpen },
  { href: "/classroom", label: "Classroom", icon: GraduationCap },
  { href: "/contest", label: "Contest", icon: Trophy },
  { href: "/workspace", label: "Workspace", icon: Code2 },
] as const;

/** Route-only — does not rerender on stress / shell chrome updates. */
const ShellSideNav = memo(function ShellSideNav() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "1") navRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <nav
      ref={navRef}
      aria-label="Platforma rejimlari"
      className="flex gap-1 overflow-x-auto border-b border-slate-200/70 bg-white/50 px-2 py-2 dark:border-slate-800/80 dark:bg-slate-950/40 lg:w-52 lg:flex-col lg:border-b-0 lg:border-r lg:px-3 lg:py-4"
    >
      {nav.map((item) => {
        const active = pathname === item.href || (item.href !== "/platform" && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium outline-none ring-sky-500/40 transition focus-visible:ring-2",
              active
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
            )}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
});

/**
 * Enterprise app shell: mode-aware chrome, skip link, keyboard-friendly nav.
 * Children render primary workspace; side slots can be added per-route.
 */
export function PlatformAppShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const { resolved, snapshot } = useResolvedUiShell();
  const modeLabel = snapshot.mode;
  const mainId = useId();

  return (
    <div className={cn(resolved.shellClassName, "flex flex-col")}>
      <a
        href={`#${mainId}`}
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline-none focus:ring-2 focus:ring-sky-400"
      >
        Asosiy kontentga o‘tish
      </a>

      {!resolved.reduceChrome ? (
        <header className="flex flex-col gap-3 border-b border-slate-200/60 bg-white/70 px-4 py-3 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/70 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <p className={cn(eduTypography.caption, "uppercase tracking-widest text-slate-500")}>Edu platform</p>
            <h1 className={cn(eduTypography.h3, "truncate text-slate-900 dark:text-slate-50")}>{title}</h1>
            {subtitle ? <p className={cn(eduTypography.bodySm, "mt-0.5 text-slate-600 dark:text-slate-400")}>{subtitle}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StressTierIndicator />
            <LiveConnectionStatus />
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-sm"
              style={{ backgroundColor: resolved.accentColor }}
            >
              {modeLabel}
            </span>
          </div>
        </header>
      ) : (
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 sm:px-4">
          <p className={cn(eduTypography.bodySm, "truncate font-semibold")}>{title}</p>
          <StressTierIndicator compact />
        </header>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {!resolved.reduceChrome ? <ShellSideNav /> : null}

        <main id={mainId} tabIndex={-1} className={cn("min-w-0 flex-1 outline-none", resolved.motionEnter)}>
          <div className={cn("mx-auto w-full max-w-6xl", resolved.density === "ultra" ? "max-w-5xl" : "")}>{children}</div>
        </main>
      </div>
    </div>
  );
}
