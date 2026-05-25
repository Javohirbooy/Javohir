const GRADE_SECTION_EMPTY_KEY = "__no_grade__";
const GRADE_TEXT_PREFIX = "txt:";
const GRADE_NUMBER_MIN = 1;
const GRADE_NUMBER_MAX = 11;

/**
 * Talaba kiritgan sinf yozuvidan asosiy raqam (7, 8, 9…).
 * «8», «8-A», «8-sinf», «8 B sinf», «8b» → 8.
 */
export function extractGradeNumberFromLabel(raw: string | undefined | null): number | null {
  const t = (raw ?? "").trim();
  if (!t) return null;

  const compact = t
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, "")
    .replace(/[-–—._]+/gu, "");

  if (!compact.length) return null;

  const m = /^(\d{1,2})/.exec(compact);
  if (!m) return null;

  const n = Number.parseInt(m[1]!, 10);
  if (!Number.isFinite(n) || n < GRADE_NUMBER_MIN || n > GRADE_NUMBER_MAX) return null;
  return n;
}

/** Paket / natija jadvalida sinflarni guruhlash — faqat raqam bo‘yicha (harflar alohida emas). */
export function bundleGradeSectionKey(raw: string | undefined | null): string {
  const t = (raw ?? "").trim();
  if (!t) return GRADE_SECTION_EMPTY_KEY;

  const n = extractGradeNumberFromLabel(t);
  if (n != null) return `g:${n}`;

  return `${GRADE_TEXT_PREFIX}${t.toLowerCase().replace(/\s+/g, " ").trim()}`;
}

function compareBundleGradeSectionKeys(a: string, b: string): number {
  if (a === GRADE_SECTION_EMPTY_KEY) return 1;
  if (b === GRADE_SECTION_EMPTY_KEY) return -1;

  const parseStructured = (
    key: string,
  ): {
    tier: number;
    n: number;
    fallback: string;
  } => {
    if (key.startsWith("g:")) {
      const n = Number.parseInt(key.slice(2), 10);
      return {
        tier: 0,
        n: Number.isFinite(n) ? n : 999,
        fallback: "",
      };
    }
    if (key.startsWith(GRADE_TEXT_PREFIX))
      return { tier: 1, n: 0, fallback: key.slice(GRADE_TEXT_PREFIX.length) };
    return { tier: 2, n: 0, fallback: key };
  };

  const pa = parseStructured(a);
  const pb = parseStructured(b);

  if (pa.tier !== pb.tier) return pa.tier - pb.tier;
  if (pa.tier === 0 && pb.tier === 0) return pa.n - pb.n;

  return pa.fallback.localeCompare(pb.fallback, "uz");
}

export function sortBundleGradeSectionKeys(keys: Iterable<string>): string[] {
  return [...keys].sort(compareBundleGradeSectionKeys);
}

/** Guruh sarlavhasi — «8-sinf» (barcha 8-variantlari bir jadvalda). */
export function canonicalBundleGradeSectionHeading(key: string): string {
  if (key === GRADE_SECTION_EMPTY_KEY) return "Sinf ko‘rsatilmagan";
  if (key.startsWith("g:")) {
    const n = Number.parseInt(key.slice(2), 10);
    if (Number.isFinite(n)) return `${n}-sinf`;
    return "Sinf";
  }
  if (key.startsWith(GRADE_TEXT_PREFIX)) {
    const fragment = key.slice(GRADE_TEXT_PREFIX.length).trim();
    return fragment || "Sinf ko‘rsatilmagan";
  }
  return key;
}
