import Link from "next/link";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { BRAND } from "@/lib/brand";
import { getServerLocale } from "@/lib/i18n/resolve-locale";
import { metadataFromSeoKey } from "@/lib/seo/public-page-metadata";

export async function generateMetadata() {
  const locale = await getServerLocale();
  return metadataFromSeoKey(locale, "resetPassword", {
    robots: { index: false, follow: false },
    titleMode: "template",
  });
}

export default function ResetPasswordPage() {
  return (
    <section className="relative min-h-[calc(100vh-4rem)] px-4 py-12 sm:px-6">
      <div className="relative mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 sm:text-3xl">{BRAND.name}</h1>
        </div>
        <Suspense
          fallback={<div className="h-48 animate-pulse rounded-3xl border border-slate-200/80 bg-white/60 dark:border-slate-700 dark:bg-slate-900/50" />}
        >
          <ResetPasswordForm />
        </Suspense>
        <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
          <Link href="/" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
            ← Bosh sahifa
          </Link>
        </p>
      </div>
    </section>
  );
}
