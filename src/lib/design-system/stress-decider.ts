import { motionClasses } from "./motion";
import type { MotionPreset, StressTier, UiDensity } from "./types";
import { stressScoreToTier, tierReduceChrome, tierShowDecorations, tierToDensity, tierToMotion } from "./stress-tiers";

export type StressLayoutDecision = {
  stressTier: StressTier;
  density: UiDensity;
  motion: MotionPreset;
  motionEnter: string;
  showDecorations: boolean;
  reduceChrome: boolean;
};

/** Pure: score → layout chrome flags (no React, no I/O). */
export function decideStressLayout(stressScore: number): StressLayoutDecision {
  const stressTier = stressScoreToTier(stressScore);
  const density = tierToDensity(stressTier);
  const motion = tierToMotion(stressTier);
  const showDecorations = tierShowDecorations(stressTier);
  const reduceChrome = tierReduceChrome(stressTier);
  return {
    stressTier,
    density,
    motion,
    motionEnter: motionClasses[motion].enter,
    showDecorations,
    reduceChrome,
  };
}
