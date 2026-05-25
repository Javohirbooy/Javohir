/** Kirish sahifasiga qaytish URL (NextAuth `callbackUrl`). */
export function loginUrlWithCallback(callbackPath: string): string {
  const path = callbackPath.startsWith("/") ? callbackPath : `/${callbackPath}`;
  return `/kirish?callbackUrl=${encodeURIComponent(path)}`;
}

/** Testlar va test ichki sahifalari — faqat tizimga kirgan foydalanuvchilar. */
export function isProtectedTestPath(pathname: string): boolean {
  return pathname === "/testlar" || pathname.startsWith("/testlar/");
}
