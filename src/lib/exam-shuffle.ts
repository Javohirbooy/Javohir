/**
 * Build display permutations for exam delivery.
 * `optionPermutations[displayIndex] = canonicalOptionIndex` for each question.
 */

export function shuffleArray<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function buildQuestionShuffle(questionIds: string[], shuffle: boolean, rng: () => number = Math.random): string[] {
  if (!shuffle) return [...questionIds];
  return shuffleArray(questionIds, rng);
}

/** Returns permutation P where displayedOptionIndex maps to canonicalOptionIndex: canonical = P[display] */
export function buildOptionPermutation(optionCount: number, shuffle: boolean, rng: () => number = Math.random): number[] {
  const base = Array.from({ length: optionCount }, (_, i) => i);
  if (!shuffle) return base;
  return shuffleArray(base, rng);
}
