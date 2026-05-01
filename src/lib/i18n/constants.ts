export const IQM_LOCALE_COOKIE = "IQM_LOCALE";

export const APP_LOCALES = ["uz", "ru", "en"] as const;
export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "uz";

export function isAppLocale(v: string): v is AppLocale {
  return (APP_LOCALES as readonly string[]).includes(v);
}
