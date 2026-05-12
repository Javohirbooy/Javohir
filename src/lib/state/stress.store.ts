import { create } from "zustand";

type StressState = {
  score: number;
  setScore: (n: number) => void;
  reset: (to?: number) => void;
};

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(Number.isFinite(n) ? n : 0)));
}

/**
 * Stress domain state only — never reads or writes UI mode / role.
 */
export const useStressStore = create<StressState>((set) => ({
  score: 15,
  setScore: (n) => set({ score: clampScore(n) }),
  reset: (to = 15) => set({ score: clampScore(to) }),
}));
