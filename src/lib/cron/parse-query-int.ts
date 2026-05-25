export function parsePositiveInt(v: string | null, fallback: number, max: number): number {
  if (v == null || v === "") return fallback;
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(max, n);
}
