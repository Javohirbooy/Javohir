export default function OlympiadLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[70vh] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.12),transparent_55%)]" />
      <div className="relative z-10 mx-auto max-w-4xl px-4">{children}</div>
    </div>
  );
}
