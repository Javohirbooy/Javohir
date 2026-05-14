/**
 * Olympiad / edtech UI tokens — Tailwind-friendly class fragments + raw palette.
 * Dark mode: pair each surface with `dark:` variants at usage sites.
 */

export const olympiadPalette = {
  primary: "#4F7CFF",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
  /** Soft dark surfaces (avoid pure black) */
  darkBg: "#0f172a",
  darkSurface: "#1e293b",
  darkElevated: "#334155",
} as const;

/** Typography scale — combine with `font-sans` / `tabular-nums` where needed */
export const olympiadType = {
  h1: "text-3xl font-bold tracking-tight sm:text-4xl",
  h2: "text-2xl font-bold tracking-tight sm:text-3xl",
  h3: "text-xl font-semibold tracking-tight sm:text-2xl",
  body: "text-base leading-relaxed",
  bodyLg: "text-lg leading-relaxed",
  caption: "text-sm text-slate-700 dark:text-slate-300",
  overline: "text-xs font-semibold uppercase tracking-widest",
} as const;

/** Spacing scale (px) — use with gap-/p-/m- Tailwind: 1→4, 2→8, … */
export const olympiadSpace = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
} as const;

export const olympiadGap = {
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
  xl: "gap-6",
} as const;

/** Button variant class stacks (use with base button layout) */
export const olympiadButton = {
  base:
    "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-50",
  primary:
    "bg-[#4F7CFF] text-white shadow-lg shadow-[#4F7CFF]/25 hover:bg-[#3d66e6] hover:shadow-xl hover:shadow-[#4F7CFF]/30 focus-visible:ring-[#4F7CFF] dark:focus-visible:ring-offset-slate-900",
  secondary:
    "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 focus-visible:ring-slate-400 dark:focus-visible:ring-offset-slate-900",
  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 focus-visible:ring-slate-400 dark:focus-visible:ring-offset-slate-900",
  danger:
    "bg-[#EF4444] text-white shadow-md hover:bg-[#dc2626] focus-visible:ring-[#EF4444] dark:focus-visible:ring-offset-slate-900",
} as const;

/** Card surfaces */
export const olympiadCard = {
  default:
    "rounded-2xl border border-slate-200/80 bg-white text-slate-900 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
  glass:
    "rounded-2xl border border-white/20 bg-white/80 text-slate-900 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100",
} as const;

/** Micro-interaction utilities */
export const olympiadMotion = {
  /** WHY: Hover lift is decorative; disabling it under `prefers-reduced-motion` avoids subtle layout jitter for sensitive users. */
  lift: "hover:-translate-y-0.5 hover:shadow-lg transition-transform duration-200 motion-reduce:hover:translate-y-0 motion-reduce:transition-shadow",
  fadeIn: "opacity-0 animate-[iq-fade-up_0.4s_ease-out_forwards]",
  slideUp: "opacity-0 animate-[iq-fade-scale_0.4s_ease-out_forwards]",
  pulseWarn: "animate-pulse",
} as const;
