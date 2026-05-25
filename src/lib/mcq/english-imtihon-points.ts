/** Ingliz tili imtihon testlari: 1–10 → 1, 11–20 → 1.5, 21–30 → 2.5 ball. */
export function englishImtihonPointsForOrder(order: number): number {
  const n = order + 1;
  if (n <= 10) return 1;
  if (n <= 20) return 1.5;
  return 2.5;
}

export const ENGLISH_IMTIHON_MAX_POINTS = 10 * 1 + 10 * 1.5 + 10 * 2.5; // 50
