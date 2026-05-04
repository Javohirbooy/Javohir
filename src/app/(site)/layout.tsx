import { AmbientBackground } from "@/components/layout/ambient-background";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen min-h-[100dvh] flex-col overflow-x-clip">
      <AmbientBackground />
      <div className="relative z-10 flex min-h-screen min-h-[100dvh] flex-col">
        <SiteHeader />
        <main className="min-w-0 flex-1">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}
