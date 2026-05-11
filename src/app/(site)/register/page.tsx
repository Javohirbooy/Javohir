import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { BRAND } from "@/lib/brand";
import { getServerLocale } from "@/lib/i18n/resolve-locale";
import { metadataFromSeoKey } from "@/lib/seo/public-page-metadata";

export async function generateMetadata() {
  const locale = await getServerLocale();
  if (process.env.NEXT_PUBLIC_ENABLE_REGISTRATION === "0") {
    return metadataFromSeoKey(locale, "registerDisabled", {
      robots: { index: false, follow: true },
      titleMode: "template",
    });
  }
  return metadataFromSeoKey(locale, "register");
}

export default function RegisterPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_REGISTRATION === "0") {
    redirect("/kirish");
  }
  return (
    <section className="relative min-h-[calc(100vh-4rem)] px-4 py-12 sm:px-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[22rem] w-[min(42rem,120%)] -translate-x-1/2 rounded-full bg-gradient-to-b from-emerald-400/18 via-teal-400/10 to-transparent blur-3xl dark:from-emerald-500/15" />
      </div>
      <div className="relative mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">Yangi akkaunt</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">{BRAND.name}</h1>
        </div>
        <RegisterForm />
        <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
          <Link href="/" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
            ← Bosh sahifa
          </Link>
        </p>
      </div>
    </section>
  );
}
