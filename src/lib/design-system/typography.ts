/**
 * Typography scale — Tailwind class stacks (mobile-first).
 * Display font uses CSS variable from root layout when available.
 */
export const eduTypography = {
  h1: "font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl",
  h2: "font-[family-name:var(--font-display)] text-xl font-bold tracking-tight sm:text-2xl md:text-3xl",
  h3: "text-lg font-semibold tracking-tight sm:text-xl md:text-2xl",
  h4: "text-base font-semibold sm:text-lg",
  h5: "text-sm font-semibold sm:text-base",
  h6: "text-xs font-semibold uppercase tracking-wide sm:text-sm",
  body: "text-sm leading-relaxed sm:text-base",
  bodySm: "text-xs leading-relaxed sm:text-sm",
  caption: "text-xs text-slate-500 dark:text-slate-400",
  mono: "font-mono text-xs tabular-nums sm:text-sm",
} as const;
