export default function OlympiadLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[70vh] overflow-x-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8 text-white sm:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.12),transparent_55%)]" />
      {/* WHY: Safe-area insets keep content off notches/home indicators on real phones; horizontal padding pairs with overflow-x-hidden. */}
      <div className="relative z-10 mx-auto max-w-6xl min-w-0 pb-[max(0.5rem,env(safe-area-inset-bottom))] ps-[max(1rem,env(safe-area-inset-left))] pe-[max(1rem,env(safe-area-inset-right))] pt-[max(0.25rem,env(safe-area-inset-top))] sm:ps-6 sm:pe-6">
        {children}
      </div>
    </div>
  );
}
