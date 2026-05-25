/** Admin / olimpiada natijalari eksporti — Excel uchun bir xil tartib va sarlavhalar. */
export const OLYMPIAD_RESULTS_CSV_HEADERS = [
  "Reyting",
  "Foiz",
  "Maks ball",
  "Ism",
  "Familiya",
  "Sinf",
  "Maktab",
  "Olimpiada",
  "Vaqt (s)",
  "E'lon",
] as const;

export const OLYMPIAD_RESULTS_CSV_HEADER_LINE = OLYMPIAD_RESULTS_CSV_HEADERS.join(",");

export function csvEscapeCell(v: string): string {
  if (/[",\r\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export type OlympiadResultCsvRowInput = {
  rank: number | null;
  score: number | null;
  maxScore: number | null;
  firstName: string;
  lastName: string;
  gradeLabel: string;
  schoolName: string;
  olympiadTitle: string;
  timeSpentSec: number | null;
  published: boolean;
};

export function formatOlympiadResultCsvLine(r: OlympiadResultCsvRowInput): string {
  return [
    csvEscapeCell(r.rank != null ? String(r.rank) : ""),
    csvEscapeCell(r.score != null ? String(r.score) : ""),
    csvEscapeCell(r.maxScore != null ? String(r.maxScore) : ""),
    csvEscapeCell(r.firstName),
    csvEscapeCell(r.lastName),
    csvEscapeCell(r.gradeLabel),
    csvEscapeCell(r.schoolName),
    csvEscapeCell(r.olympiadTitle),
    csvEscapeCell(r.timeSpentSec != null ? String(r.timeSpentSec) : ""),
    csvEscapeCell(r.published ? "ha" : "yo'q"),
  ].join(",");
}

export function timeSpentSeconds(startedAt: Date | null | undefined, endedAt: Date | null | undefined): number | null {
  if (!startedAt || !endedAt) return null;
  return Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));
}

/** Toshkent vaqti bo‘yicha `natijalar_YYYY-MM-DD.csv` (ASCII — Content-Disposition uchun xavfsiz). */
export function natijalarCsvFilename(now = new Date()): string {
  const ymd = now.toLocaleDateString("sv-SE", { timeZone: "Asia/Tashkent" });
  return `natijalar_${ymd}.csv`;
}

export function parseCsvContentDispositionFilename(cd: string | null, fallback: string): string {
  if (!cd) return fallback;
  const m = /filename="([^"]+)"/.exec(cd);
  const name = m?.[1]?.trim();
  return name && name.length > 0 ? name : fallback;
}
