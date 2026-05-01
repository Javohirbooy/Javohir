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
    <header className="sticky top-0 z-50 border-b border-emerald-100/90 bg-white/80 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center px-4 py-3 sm:px-6">
        <PremiumNavbar user={sessionLite} locale={locale} />
      </div>
    </header>
  );
}
