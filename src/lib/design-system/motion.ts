import type { MotionPreset } from "./types";

/** Motion presets — respect prefers-reduced-motion at usage sites. */
export const motionClasses: Record<MotionPreset, { enter: string; hover: string }> = {
  smooth: {
    enter: "motion-safe:animate-[iq-fade-up_0.45s_ease-out_forwards]",
    hover: "motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:-translate-y-0.5",
  },
  minimal: {
    enter: "motion-safe:transition-opacity motion-safe:duration-150 motion-safe:opacity-100",
    hover: "motion-safe:transition-colors motion-safe:duration-150",
  },
  competitive: {
    enter: "motion-safe:transition-none",
    hover: "motion-safe:transition-colors motion-safe:duration-75",
  },
};
