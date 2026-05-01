import Link from "next/link";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { DashboardSidebarNav, type DashboardNavIcon } from "@/components/layout/dashboard-sidebar-nav";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

type Item = { href: string; label: string; icon: DashboardNavIcon };

export function DashboardShell({
  title,
  items,
  children,
  accent = "from-emerald-600 via-green-500 to-teal-400",
}: {
  title: string;
  items: Item[];
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-transparent text-slate-800">
      {/* Ambient neon orbs — kelajak uslubi */}
      <div
        className="pointer-events-none fixed -left-40 top-1/5 h-[480px] w-[480px] rounded-full bg-gradient-to-br from-emerald-600/35 via-green-600/20 to-transparent blur-[110px]"
        style={{ animation: "iq-pulse-glow 9s ease-in-out infinite" }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -right-32 bottom-[15%] h-[440px] w-[440px] rounded-full bg-gradient-to-tl from-teal-400/25 via-emerald-500/15 to-transparent blur-[100px]"
        style={{ animation: "iq-pulse-glow 11s ease-in-out infinite 1.2s" }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed left-1/2 top-1/3 h-[320px] w-[520px] -translate-x-1/2 rounded-full bg-green-500/10 blur-[90px]"
        style={{ animation: "iq-aurora 18s ease-in-out infinite" }}
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_75%_50%_at_50%_-5%,rgba(34,197,94,0.14),transparent_55%)]" aria-hidden />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[length:56px_56px] opacity-45" aria-hidden />

      {/* Mobile top */}
      <div className="relative z-10 mx-auto mb-5 max-w-[1400px] space-y-4 px-4 py-5 sm:px-6 lg:mb-0 lg:hidden">
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl bg-gradient-to-r p-4 text-center font-display text-sm font-bold tracking-wide text-white shadow-[0_0_32px_-4px_rgba(16,185,129,0.36)] ring-1 ring-white/35",
            accent,
          )}
        >
          <span className="relative z-10">{title}</span>
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_40%,rgba(255,255,255,0.12)_50%,transparent_60%)] bg-[length:200%_100%] opacity-60" style={{ animation: "iq-shimmer 4s linear infinite" }} />
        </div>
        <div className="iq-glass-panel rounded-2xl p-4">
          <DashboardSidebarNav items={items} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className="rounded-xl border border-emerald-200/70 bg-white/80 px-4 py-2 text-xs font-medium text-slate-700 backdrop-blur-md transition-all duration-300 hover:scale-[1.03] hover:border-emerald-400/40 hover:text-emerald-700 hover:shadow-[0_0_24px_-6px_rgba(34,197,94,0.2)]"
          >
            Sayt
          </Link>
          <SignOutButton />
        </div>
      </div>

      <div className="relative z-10 mx-auto flex max-w-[1400px] gap-6 px-4 pb-14 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <aside className="iq-glass-panel sticky top-8 hidden h-[calc(100vh-4rem)] w-[272px] shrink-0 flex-col rounded-[1.75rem] p-5 lg:flex">
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 font-display text-sm font-bold leading-snug tracking-tight text-white shadow-lg ring-1 ring-white/15",
              accent,
            )}
          >
            <span className="relative z-10">{title}</span>
            <div
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_35%,rgba(255,255,255,0.22)_50%,transparent_65%)] bg-[length:220%_100%] opacity-40"
              style={{ animation: "iq-shimmer 5s linear infinite" }}
            />
          </div>
          <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
            <DashboardSidebarNav items={items} />
          </div>
          <div className="mt-4 space-y-2 border-t border-emerald-100/80 pt-4">
            <SignOutButton />
            <Link
              href="/"
              className="block rounded-xl px-3 py-2.5 text-center text-sm text-slate-500 transition-all duration-300 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-[0_0_20px_-8px_rgba(34,197,94,0.2)]"
            >
              Saytga qaytish
            </Link>
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-5 lg:space-y-6">
          <DashboardHeader />
          <main className="iq-dashboard-main space-y-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
