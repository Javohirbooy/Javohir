import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { BRAND } from "@/lib/brand";

export default function LoginPage() {
  return (
    <section className="relative min-h-[calc(100vh-4rem)] px-4 py-12 sm:px-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[22rem] w-[min(42rem,120%)] -translate-x-1/2 rounded-full bg-gradient-to-b from-emerald-400/18 via-teal-400/10 to-transparent blur-3xl dark:from-emerald-500/15" />
      </div>

      <div className="relative mx-auto flex w-full max-w-md flex-col">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">Kabinet</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            {BRAND.name}
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{BRAND.tagline}</p>
        </div>

        <Suspense
          fallback={
            <div className="h-64 w-full animate-pulse rounded-3xl border border-slate-200/80 bg-white/60 dark:border-slate-700 dark:bg-slate-900/50" />
          }
        >
          <LoginForm />
        </Suspense>

        <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
          <Link
            href="/"
            className="font-semibold text-emerald-700 underline-offset-2 transition hover:text-emerald-800 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            ← Bosh sahifaga
          </Link>
        </p>
      </div>
    </section>
  );
}
