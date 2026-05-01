"use client";

import { useSession } from "next-auth/react";
import { Bell, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Icon3DGlyph } from "@/components/ui/icon-3d";

export function DashboardHeader({ className }: { className?: string }) {
  const { data } = useSession();
  const user = data?.user;
  const initial = user?.name?.trim()?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <header
      className={cn(
        "group/header flex flex-col gap-4 rounded-[1.75rem] border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/40 to-white p-4 shadow-[0_0_48px_-22px_rgba(16,185,129,0.22),inset_0_1px_0_0_rgba(255,255,255,0.8)] backdrop-blur-[16px] backdrop-saturate-[1.1] sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5",
        "transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-emerald-400/20 hover:shadow-[0_0_56px_-10px_rgba(34,197,94,0.22),0_0_40px_-12px_rgba(16,185,129,0.15)]",
        className,
      )}
    >
      <div className="group relative min-w-0 flex-1">
        <span className="pointer-events-none absolute left-4 top-1/2 z-[1] -translate-y-1/2">
          <Icon3DGlyph
            icon={Search}
            size="md"
            className="text-emerald-300/70 transition-colors duration-300 group-focus-within:text-emerald-200"
          />
        </span>
        <input
          type="search"
          placeholder="Qidiruv — testlar, fanlar..."
          className="w-full rounded-2xl border border-emerald-100 bg-white py-3 pl-[3.25rem] pr-4 font-sans text-sm text-slate-700 outline-none ring-0 transition-all duration-300 placeholder:text-slate-400 focus:border-emerald-400/55 focus:bg-emerald-50/40 focus:shadow-[0_0_32px_-8px_rgba(34,197,94,0.2),inset_0_0_0_1px_rgba(34,197,94,0.1)] focus:ring-2 focus:ring-emerald-400/20"
          aria-label="Qidiruv"
        />
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          className="group hidden rounded-2xl border border-emerald-100 bg-white p-3 text-slate-500 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-emerald-400/40 hover:text-emerald-700 hover:shadow-[0_0_28px_-8px_rgba(34,197,94,0.25)] motion-reduce:hover:scale-100 sm:block"
          aria-label="Bildirishnomalar"
        >
          <Icon3DGlyph icon={Bell} size="md" />
        </button>

        <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 px-3 py-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.85)] backdrop-blur-sm sm:px-4">
          <div className="min-w-0 text-right">
            <p className="font-display truncate text-sm font-semibold tracking-tight text-slate-800">{user?.name ?? "Mehmon"}</p>
            <p className="truncate text-xs text-slate-500">{user?.email ?? ""}</p>
            {user?.role === "STUDENT" && user.studentNumber != null ? (
              <p className="mt-0.5 truncate font-mono text-[0.7rem] font-semibold text-sky-700">ID: {user.studentNumber}</p>
            ) : null}
          </div>
          <div
            className="group/avatar relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 font-display text-sm font-bold text-white shadow-[0_0_24px_rgba(34,197,94,0.5),0_0_20px_rgba(16,185,129,0.35)] ring-2 ring-white/25 transition-transform duration-300 hover:scale-110 motion-reduce:hover:scale-100"
            aria-hidden
          >
            {initial}
            <Sparkles className="pointer-events-none absolute -right-1 -top-1 h-3.5 w-3.5 text-emerald-100 drop-shadow-[0_0_8px_rgba(34,197,94,0.9)] transition-transform duration-300 iq-3d-glyph group-hover/avatar:scale-125" />
          </div>
        </div>
      </div>
    </header>
  );
}
