import { csvEscapeCell } from "@/lib/olympiad/olympiad-results-csv-format";

export const OLYMPIAD_BUNDLE_RESULTS_CSV_HEADERS = [
  "Umumiy №",
  "Jami ball",
  "Maks ball",
  "Foiz",
  "Ism",
  "Familiya",
  "Sinf",
  "Maktab",
  "Fanlar",
  "Holat",
] as const;

export const OLYMPIAD_BUNDLE_RESULTS_CSV_HEADER_LINE = OLYMPIAD_BUNDLE_RESULTS_CSV_HEADERS.join(",");

export type OlympiadBundleResultCsvRowInput = {
  overallRank: number | null;
  totalScore: number | null;
  totalMaxScore: number | null;
  firstName: string;
  lastName: string;
  gradeLabel: string;
  schoolName: string;
  completedSubjects: number;
  totalSubjects: number;
  completed: boolean;
};

export function formatOlympiadBundleResultCsvLine(r: OlympiadBundleResultCsvRowInput): string {
  const pct =
    r.totalMaxScore != null && r.totalMaxScore > 0 && r.totalScore != null
      ? Math.round((r.totalScore / r.totalMaxScore) * 100)
      : null;
  return [
    csvEscapeCell(r.overallRank != null ? String(r.overallRank) : ""),
    csvEscapeCell(r.totalScore != null ? String(r.totalScore) : ""),
    csvEscapeCell(r.totalMaxScore != null ? String(r.totalMaxScore) : ""),
    csvEscapeCell(pct != null ? String(pct) : ""),
    csvEscapeCell(r.firstName),
    csvEscapeCell(r.lastName),
    csvEscapeCell(r.gradeLabel),
    csvEscapeCell(r.schoolName),
    csvEscapeCell(`${r.completedSubjects}/${r.totalSubjects}`),
    csvEscapeCell(r.completed ? "yakunlangan" : "jarayonda"),
  ].join(",");
}

export function bundleNatijalarCsvFilename(bundleTitle: string): string {
  const safe = bundleTitle.replace(/[^\w\u0400-\u04FF-]+/g, "_").slice(0, 40);
  const d = new Date().toISOString().slice(0, 10);
  return `paket-natijalar-${safe || "export"}-${d}.csv`;
}
