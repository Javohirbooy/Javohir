"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Kichik variant — navbar / dashboard */
  size?: "sm" | "md";
};

export function ThemeToggle({ className, size = "md" }: Props) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const dim = size === "sm" ? "h-9 w-9" : "h-10 w-10";
  const icon = size === "sm" ? "h-4 w-4" : "h-[1.15rem] w-[1.15rem]";

  if (!mounted) {
    return (
      <span
        className={cn("inline-flex shrink-0 rounded-xl border border-emerald-200/80 bg-white/90 dark:border-slate-600 dark:bg-slate-800/90", dim, className)}
        aria-hidden
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl border border-emerald-200/80 bg-white/90 text-slate-700 shadow-sm transition hover:border-emerald-400/50 hover:bg-emerald-50/80 hover:text-emerald-900 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-700/90 dark:hover:text-white",
        dim,
        className,
      )}
      aria-label={isDark ? "Yorug‘ rejim" : "Qorong‘u rejim"}
    >
      {isDark ? <Sun className={icon} aria-hidden /> : <Moon className={icon} aria-hidden />}
    </button>
  );
}
