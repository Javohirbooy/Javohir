import { auth } from "@/auth";
import { PremiumNavbar } from "@/components/layout/premium-navbar";
import { getServerLocale } from "@/lib/i18n/resolve-locale";
import type { AppRole } from "@/lib/permissions";

export async function SiteHeader() {
  const [session, locale] = await Promise.all([auth(), getServerLocale()]);
  const sessionLite = session?.user
    ? { name: session.user.name, email: session.user.email, role: session.user.role as AppRole }
    : null;

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-100/90 bg-white/80 pt-[env(safe-area-inset-top)] backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex w-full max-w-7xl min-w-0 items-center px-3 py-3 sm:px-6 sm:py-4">
        <PremiumNavbar user={sessionLite} locale={locale} />
      </div>
    </header>
  );
}
