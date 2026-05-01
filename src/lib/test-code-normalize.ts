/**
 * Test kodi: DB va forma kirishini bir xil qilish (katta harf, bo‘shliq, noyob Unicode).
 */
export function normalizeTestCode(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}
