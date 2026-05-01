import { cookies } from "next/headers";
import { DEFAULT_LOCALE, IQM_LOCALE_COOKIE, type AppLocale, isAppLocale } from "./constants";

export async function getServerLocale(): Promise<AppLocale> {
  const jar = await cookies();
  const raw = jar.get(IQM_LOCALE_COOKIE)?.value;
  if (raw && isAppLocale(raw)) return raw;
  return DEFAULT_LOCALE;
}
