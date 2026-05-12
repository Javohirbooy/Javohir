/**
 * Enterprise multi-surface UI — modes map to product metaphors (not 1:1 clones).
 * Extend with new modes without breaking route or role resolution.
 */

export type UiMode = "learning" | "classroom" | "contest" | "coding";

/** Product role — drives chrome density and default navigation affordances. */
export type PlatformRole = "student" | "teacher" | "admin" | "contestant";

/**
 * Stress-driven chrome tier (client-side UX only).
 * Keep independent of anti-cheat / violation signals.
 */
export type StressTier = "relaxed" | "normal" | "focused" | "hardcore";

export type MotionPreset = "smooth" | "minimal" | "competitive";

export type UiDensity = "comfortable" | "compact" | "ultra";

export type ThemeVariant = "light" | "dark" | "hybrid";
