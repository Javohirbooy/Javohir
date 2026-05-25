/** Paketda bir talabaning qayta ro‘yxatdan o‘tishini aniqlash (urinishlarni birlashtirish). */
export function normalizeBundleStudentField(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function bundleStudentDedupKey(p: {
  firstName: string;
  lastName: string;
  gradeLabel: string;
  schoolName: string;
  deviceFpHash?: string | null;
}): string {
  if (p.deviceFpHash?.trim()) return `fp:${p.deviceFpHash.trim()}`;
  return [
    "id",
    normalizeBundleStudentField(p.firstName),
    normalizeBundleStudentField(p.lastName),
    normalizeBundleStudentField(p.gradeLabel),
    normalizeBundleStudentField(p.schoolName),
  ].join("|");
}
