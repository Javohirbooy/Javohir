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
    <div className="relative min-h-screen overflow-x-hidden bg-transparent text-slate-800 dark:text-slate-100">
      {/* Yengil fon — diqqatni kontentga qaratish */}
      <div
        className="pointer-events-none fixed -left-32 top-1/4 h-[380px] w-[380px] rounded-full bg-gradient-to-br from-emerald-600/18 via-green-600/10 to-transparent blur-[100px] dark:from-emerald-500/12 dark:via-green-600/8"
        style={{ animation: "iq-pulse-glow 12s ease-in-out infinite" }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -right-24 bottom-[20%] h-[340px] w-[340px] rounded-full bg-gradient-to-tl from-teal-400/14 via-emerald-500/8 to-transparent blur-[90px] dark:from-teal-500/10"
        style={{ animation: "iq-pulse-glow 14s ease-in-out infinite 1.5s" }}
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_-10%,rgba(34,197,94,0.08),transparent_50%)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(34,197,94,0.06),transparent_55%)]" aria-hidden />

      {/* Mobile top */}
      <div className="relative z-10 mx-auto mb-5 max-w-[1400px] space-y-4 px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 lg:mb-0 lg:hidden">
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl bg-gradient-to-r p-4 text-center font-display text-sm font-bold tracking-wide text-white shadow-[0_0_32px_-4px_rgba(16,185,129,0.36)] ring-1 ring-white/35",
            accent,
          )}
        >
          <span className="relative z-10">{title}</span>
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
          </div>
          <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
            <DashboardSidebarNav items={items} />
          </div>
          <div className="mt-4 space-y-2 border-t border-emerald-100/80 pt-4 dark:border-slate-600/60">
            <SignOutButton />
            <Link
              href="/"
              className="block rounded-xl px-3 py-2.5 text-center text-sm text-slate-500 transition-all duration-300 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-[0_0_20px_-8px_rgba(34,197,94,0.2)] dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-emerald-300"
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
