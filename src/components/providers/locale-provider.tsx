"use client";

import { createContext, useContext, useMemo } from "react";
import type { AppLocale } from "@/lib/i18n/constants";
import { DEFAULT_LOCALE } from "@/lib/i18n/constants";
import { t as translate } from "@/lib/i18n/t";

const LocaleContext = createContext<AppLocale>(DEFAULT_LOCALE);

export function LocaleProvider({ locale, children }: { locale: AppLocale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): AppLocale {
  return useContext(LocaleContext);
}

export function useT() {
  const locale = useLocale();
  return useMemo(
    () => (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );
}
