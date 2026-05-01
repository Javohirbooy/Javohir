/** HttpOnly cookie: bitta yoki bir nechta test id (JSON massiv yoki legacy bitta id). */
export const TEST_GRANT_COOKIE = "iqm_test_grant";

/** Asosiy test + qo‘shimchalar; jami tavsiya etilgan yuqori chegarasi. */
export const TEST_GRANT_MAX_TESTS = 12;

export type TestCodeFormState = { error?: string } | null;

/** Cookie qiymatini test id ro‘yxatiga aylantiradi (legacy: bitta cuid qator). */
export function parseTestGrantCookie(raw: string | undefined | null): string[] {
  if (!raw?.trim()) return [];
  const t = raw.trim();
  if (t.startsWith("[")) {
    try {
      const a = JSON.parse(t) as unknown;
      if (Array.isArray(a)) {
        return [...new Set(a.filter((x): x is string => typeof x === "string" && x.length > 0))];
      }
    } catch {
      return [];
    }
    return [];
  }
  return [t];
}

/** Cookie saqlash: bitta testda qisqa format, bir nechtada JSON. */
export function serializeTestGrantCookie(ids: string[]): string {
  const u = [...new Set(ids.filter(Boolean))].slice(0, TEST_GRANT_MAX_TESTS);
  if (u.length === 0) return "";
  if (u.length === 1) return u[0]!;
  return JSON.stringify(u);
}

export function studentHasGrantForTest(grantCookieRaw: string | undefined | null, testId: string): boolean {
  return parseTestGrantCookie(grantCookieRaw).includes(testId);
}
