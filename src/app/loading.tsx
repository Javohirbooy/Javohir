export default function AppLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="animate-pulse space-y-4">
        <div className="h-7 w-1/3 rounded-lg bg-emerald-100 dark:bg-slate-800" />
        <div className="h-4 w-2/3 rounded-lg bg-emerald-50 dark:bg-slate-900" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-28 rounded-2xl bg-white/80 dark:bg-slate-900/70" />
          <div className="h-28 rounded-2xl bg-white/80 dark:bg-slate-900/70" />
          <div className="h-28 rounded-2xl bg-white/80 dark:bg-slate-900/70" />
        </div>
      </div>
    </div>
  );
}
