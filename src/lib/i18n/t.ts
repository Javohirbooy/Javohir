import type { AppLocale } from "./constants";
import { DEFAULT_LOCALE } from "./constants";
import { messages } from "./messages";

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as object)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

/**
 * Localized string by dot path, e.g. `nav.home`, `testRunner.next`.
 * Unknown keys fall back to the default locale, then to the key itself.
 * Placeholders: `{name}` in the string with matching `vars.name`.
 */
export function t(locale: AppLocale, key: string, vars?: Record<string, string | number>): string {
  const table = messages[locale] ?? messages[DEFAULT_LOCALE];
  let raw = getByPath(table, key);
  if (typeof raw !== "string") {
    raw = getByPath(messages[DEFAULT_LOCALE], key);
  }
  if (typeof raw !== "string") return key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = vars[name];
    return v != null ? String(v) : "";
  });
}

/** Test header line: grade label + subject title (subject title is still from DB). */
export function formatTestMetaLine(locale: AppLocale, gradeNumber: number, subjectTitle: string) {
  return t(locale, "tests.metaLine", { grade: gradeNumber, subject: subjectTitle });
}
