"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
  Menu,
  Trophy,
  UserCircle2,
  X,
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
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const L = navLabels(locale);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setSectionsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!sectionsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSectionsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sectionsOpen]);

  useEffect(() => {
    if (!sectionsOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sectionsOpen]);

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
          label: L.tests,
          icon: Activity,
          homeExact: false,
        },
        { href: routes.ranking, label: L.ranking, icon: Trophy, homeExact: false },
        { href: routes.about, label: L.about, icon: Info, homeExact: false },
      ] as const,
    [L, routes, user?.role],
  );

  function drawerLinkCls(href: string, homeExact: boolean) {
    const active = isNavActive(pathname, href, homeExact);
    return cn(
      "group flex w-full min-h-[48px] items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
      active
        ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200 shadow-md shadow-emerald-900/10"
        : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-800",
    );
  }

  const logoBlock = (
    <Link
      href={routes.home}
      className="group flex shrink-0 items-center gap-2 rounded-xl py-1 pl-1 sm:gap-2.5"
      aria-label={BRAND.name}
    >
      <span className="relative h-10 w-10 overflow-hidden rounded-2xl ring-1 ring-emerald-200/70 shadow-[0_12px_24px_-10px_rgba(16,185,129,0.45)] sm:h-11 sm:w-11 iq-logo-3d">
        <Image
          src="/iq-logo-3d.png"
          alt=""
          fill
          sizes="(max-width: 640px) 40px, 44px"
          className="object-cover"
          priority
        />
      </span>
      <span className="hidden flex-col leading-tight sm:flex">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">IQ Monitoring</span>
        <span className="max-w-[9rem] truncate text-sm font-bold text-emerald-900 dark:text-emerald-100 sm:max-w-none sm:text-base">{BRAND.name}</span>
      </span>
    </Link>
  );

  return (
    <>
      <div className="relative flex w-full min-w-0 flex-1 flex-nowrap items-center gap-2 sm:gap-3 md:gap-4 lg:gap-5">
        {/* Chap: uch chiziq + logo */}
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-white text-slate-800 shadow-sm transition hover:bg-emerald-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 sm:h-11 sm:w-11"
            aria-expanded={sectionsOpen}
            aria-controls="premium-site-sections"
            aria-label={L.menu}
            onClick={() => {
              setSectionsOpen((v) => !v);
              setLocaleOpen(false);
              setUserMenuOpen(false);
            }}
          >
            {sectionsOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
          {logoBlock}
        </div>

        <div className="min-w-0 flex-1" aria-hidden />

        {/* O‘ng: tema → til → kabinet/kirish */}
        <div className="flex shrink-0 flex-nowrap items-center gap-x-2 sm:gap-x-3 lg:gap-x-4">
          <ThemeToggle size="sm" />
          <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              setLocaleOpen((v) => !v);
              setUserMenuOpen(false);
              setSectionsOpen(false);
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
                    setSectionsOpen(false);
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

      {mounted && sectionsOpen
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-[90] cursor-default border-0 bg-slate-950/45 p-0 backdrop-blur-[2px] dark:bg-slate-950/60"
                aria-label={L.closeMenu}
                onClick={() => setSectionsOpen(false)}
              />
              <aside
                id="premium-site-sections"
                role="dialog"
                aria-modal="true"
                aria-labelledby="premium-site-sections-title"
                className="fixed inset-y-0 left-0 z-[100] flex h-dvh w-[min(22rem,90vw)] max-w-full flex-col border-r border-emerald-100/90 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950"
              >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-emerald-100 px-4 py-4 dark:border-slate-800">
                  <h2 id="premium-site-sections-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {L.menu}
                  </h2>
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-white text-slate-800 transition hover:bg-emerald-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                    onClick={() => setSectionsOpen(false)}
                    aria-label={L.closeMenu}
                  >
                    <X className="h-5 w-5" aria-hidden />
                  </button>
                </div>
                <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="Main">
                  {navItems.map((it) => {
                    const navActive = isNavActive(pathname, it.href, it.homeExact);
                    return (
                      <Link
                        key={it.href + it.label}
                        href={it.href}
                        className={drawerLinkCls(it.href, it.homeExact)}
                        onClick={() => setSectionsOpen(false)}
                      >
                        <Icon3D icon={it.icon} size="md" active={navActive} />
                        <span>{it.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </aside>
            </>,
            document.body,
          )
        : null}
    </>
  );
}

