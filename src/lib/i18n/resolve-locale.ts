import { cookies } from "next/headers";
import { DEFAULT_LOCALE, IQM_LOCALE_COOKIE, type AppLocale, isAppLocale } from "./constants";

type CookieJar = Awaited<ReturnType<typeof cookies>>;

/** Bir marta `cookies()` chaqirilgan bo‘lsa — qo‘shimcha async kutish yo‘q. */
export function resolveLocaleFromCookies(jar: CookieJar): AppLocale {
  const raw = jar.get(IQM_LOCALE_COOKIE)?.value;
  if (raw && isAppLocale(raw)) return raw;
  return DEFAULT_LOCALE;
}

export async function getServerLocale(): Promise<AppLocale> {
  return resolveLocaleFromCookies(await cookies());
}
