"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { setLocale } from "@/app/actions/locale";
import { BRAND } from "@/lib/brand";
import type { AppLocale } from "@/lib/i18n/constants";
import { navLabels } from "@/lib/i18n/nav";
import { getRoleScopedNav, isNavActive } from "@/lib/nav-routes";
import type { AppRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Icon3D, Icon3DGlyph } from "@/components/ui/icon-3d";
import {
  Activity,
  BookOpen,
  ChevronDown,
  Globe,
  GraduationCap,
  Home,
  Info,
  LayoutDashboard,
  LogOut,
  Trophy,
  UserCircle2,
} from "lucide-react";

type UserLite = { name?: string | null; email?: string | null; role?: AppRole } | null;

const roleBadge: Record<AppRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  TEACHER: "Teacher",
  STUDENT: "Student",
};

export function PremiumNavbar({ user, locale }: { user: UserLite; locale: AppLocale }) {
  const pathname = usePathname();
  const [localeOpen, setLocaleOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const L = navLabels(locale);

  const routes = useMemo(() => getRoleScopedNav(user?.role as AppRole | undefined), [user?.role]);

  const panelHref =
    user?.role === "SUPER_ADMIN"
      ? "/super-admin"
      : user?.role === "ADMIN"
        ? "/admin"
        : user?.role === "TEACHER"
          ? "/oqituvchi"
          : user?.role === "STUDENT"
            ? "/oquvchi"
            : null;

  const navItems = useMemo(
    () =>
      [
        { href: routes.home, label: L.home, icon: Home, homeExact: true },
        { href: routes.subjects, label: L.subjects, icon: BookOpen, homeExact: false },
        { href: routes.grades, label: L.grades, icon: GraduationCap, homeExact: false },
        {
          href: routes.tests,
          label: user?.role === "STUDENT" ? L.testCode : L.tests,
          icon: Activity,
          homeExact: false,
        },
        { href: routes.ranking, label: L.ranking, icon: Trophy, homeExact: false },
        { href: routes.about, label: L.about, icon: Info, homeExact: false },
      ] as const,
    [L, routes, user?.role],
  );

  function linkCls(href: string, homeExact: boolean) {
    const active = isNavActive(pathname, href, homeExact);
    return cn(
      "group inline-flex min-h-[44px] shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-medium transition-all sm:min-h-0 sm:gap-3 sm:px-5 sm:py-2.5 sm:text-sm",
      active
        ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200 shadow-lg shadow-emerald-900/10"
        : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-800",
    );
  }

  return (
    <div className="relative flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 sm:flex-nowrap sm:gap-x-6 lg:gap-x-8">
      <Link href={routes.home} className="group flex min-w-0 shrink-0 items-center gap-3">
        <span className="relative h-11 w-11 overflow-hidden rounded-2xl ring-1 ring-emerald-200/70 shadow-[0_12px_24px_-10px_rgba(16,185,129,0.45)] sm:h-12 sm:w-12 iq-logo-3d">
          <Image
            src="/iq-logo-3d.png"
            alt="IQ logo"
            fill
            sizes="(max-width: 640px) 44px, 48px"
            className="object-cover"
            priority
          />
        </span>
        <span className="hidden min-w-0 flex-col leading-tight sm:flex">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-emerald-700">IQ Monitoring</span>
          <span className="truncate text-base font-bold text-emerald-900">{BRAND.name}</span>
        </span>
      </Link>

      <nav className="order-3 flex min-h-[3rem] w-full min-w-0 basis-full items-center gap-3 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:order-none sm:min-h-0 sm:w-auto sm:flex-1 sm:basis-auto sm:justify-center sm:gap-4 sm:py-0 md:gap-5 lg:gap-6 [&::-webkit-scrollbar]:hidden">
        {navItems.map((it) => {
          const navActive = isNavActive(pathname, it.href, it.homeExact);
          return (
            <Link key={it.href + it.label} href={it.href} className={linkCls(it.href, it.homeExact)}>
              <Icon3D icon={it.icon} size="md" active={navActive} />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex min-w-0 shrink-0 items-center justify-end gap-3 sm:gap-5 lg:gap-6">
        <ThemeToggle size="sm" />
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              setLocaleOpen((v) => !v);
              setUserMenuOpen(false);
            }}
            className="group inline-flex h-10 w-[7.25rem] items-center justify-between rounded-xl border border-emerald-200 bg-white px-2 text-xs text-slate-700 backdrop-blur-xl dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 sm:h-11 sm:w-[8.5rem] sm:px-3 sm:text-sm"
          >
            <span className="inline-flex items-center gap-2">
              <Icon3DGlyph icon={Globe} size="md" className="text-emerald-600" />
              {locale.toUpperCase()}
            </span>
            <span className={cn("inline-flex transition-transform duration-300", localeOpen && "rotate-180")}>
              <Icon3DGlyph icon={ChevronDown} size="md" />
            </span>
          </button>
          {localeOpen ? (
            <div className="absolute right-0 z-40 mt-2 w-[8.5rem] rounded-xl border border-emerald-200 bg-white/95 p-1 shadow-2xl shadow-emerald-900/15 backdrop-blur-2xl dark:border-slate-600 dark:bg-slate-900/95 dark:shadow-black/40">
              {(["uz", "ru", "en"] as const).map((loc) => (
                <form key={loc} action={setLocale}>
                  <button
                    type="submit"
                    name="locale"
                    value={loc}
                    className={cn(
                      "w-full rounded-lg px-3 py-2 text-left text-sm font-semibold uppercase transition",
                      loc === locale ? "bg-emerald-100 text-emerald-900" : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800",
                    )}
                  >
                    {loc}
                  </button>
                </form>
              ))}
            </div>
          ) : null}
        </div>

        {user ? (
          <>
            {panelHref ? (
              <Button href={panelHref} variant="glass" className="h-11 shrink-0 border-emerald-300/60 px-4 text-slate-800">
                {L.cabinet}
              </Button>
            ) : null}
            <div className="relative min-w-0">
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen((v) => !v);
                  setLocaleOpen(false);
                }}
                className="group inline-flex h-11 max-w-[15rem] items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 text-left backdrop-blur-xl dark:border-slate-600 dark:bg-slate-800"
              >
                <Icon3DGlyph icon={UserCircle2} size="md" className="shrink-0 text-emerald-600" />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-slate-800">{user.name ?? "User"}</span>
                  <span className="block truncate text-[11px] text-slate-500">{user.email ?? roleBadge[user.role ?? "STUDENT"]}</span>
                </span>
                <span className="ml-auto rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                  {roleBadge[user.role ?? "STUDENT"]}
                </span>
              </button>
              {userMenuOpen ? (
                <div className="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-emerald-200 bg-white/95 p-2 shadow-2xl shadow-emerald-900/15 backdrop-blur-2xl dark:border-slate-600 dark:bg-slate-900/95 dark:shadow-black/40">
                  <Link
                    href={panelHref ?? "/"}
                    className="group flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-emerald-50"
                  >
                    <Icon3DGlyph icon={LayoutDashboard} size="md" className="shrink-0 text-emerald-700" />
                    {L.profileDashboard}
                  </Link>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="group mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-700 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                  >
                    <Icon3DGlyph icon={LogOut} size="md" className="shrink-0" />
                    {L.signOut}
                  </button>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <Button href="/kirish" variant="primary" className="h-11 shrink-0 px-5 text-sm shadow-violet-600/30">
            {L.login}
          </Button>
        )}
      </div>

    </div>
  );
}

