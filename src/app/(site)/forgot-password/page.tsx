import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { BRAND } from "@/lib/brand";

export default function ForgotPasswordPage() {
  return (
    <section className="relative min-h-[calc(100vh-4rem)] px-4 py-12 sm:px-6">
      <div className="relative mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 sm:text-3xl">{BRAND.name}</h1>
        </div>
        <ForgotPasswordForm />
        <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
          <Link href="/" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
            ← Bosh sahifa
          </Link>
        </p>
      </div>
    </section>
  );
}
