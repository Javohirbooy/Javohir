import { AmbientBackground } from "@/components/layout/ambient-background";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen min-h-[100dvh] flex-col overflow-x-clip">
      <a
        href="#site-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-[max(0.5rem,env(safe-area-inset-top))] focus:z-[100] focus:rounded-xl focus:bg-emerald-700 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-300"
      >
        Asosiy mazmunga o‘tish
      </a>
      <AmbientBackground />
      <div className="relative z-10 flex min-h-screen min-h-[100dvh] flex-col">
        <SiteHeader />
        <main id="site-main" tabIndex={-1} className="min-w-0 flex-1 scroll-mt-20 outline-none">
          {children}
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
