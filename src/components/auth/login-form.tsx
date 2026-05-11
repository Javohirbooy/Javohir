"use client";

import { useState } from "react";
import Link from "next/link";
import { getSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogIn, Mail, Lock } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const notice = searchParams.get("notice");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const signInTimeoutMs = 45_000;
    try {
      if (process.env.NEXT_PUBLIC_AUTH_DEBUG === "1") {
        console.info("[iqm-login] submit", { identifier, hasPassword: password.length > 0 });
      }
      const res = await Promise.race([
        signIn("credentials", { identifier, password, redirect: false }),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error("TIMEOUT")), signInTimeoutMs),
        ),
      ]);
      if (process.env.NEXT_PUBLIC_AUTH_DEBUG === "1") {
        console.info("[iqm-login] signIn result", { ok: res?.ok, error: res?.error, status: res?.status, url: res?.url });
      }
      if (res == null || !res.ok) {
        setError(
          res?.error
            ? "Email/ism-familiya yoki parol noto‘g‘ri. Email tasdiqlangan va akkaunt faolligini tekshiring."
            : "Kirish javobi kutilmadi. Internet yoki serverni tekshirib, qayta urinib ko‘ring.",
        );
        return;
      }
      const session = await getSession();
      if (process.env.NEXT_PUBLIC_AUTH_DEBUG === "1") {
        console.info("[iqm-login] session role", session?.user?.role);
      }
      const role = session?.user?.role;
      const dest =
        role === "SUPER_ADMIN"
          ? "/super-admin"
          : role === "ADMIN"
            ? "/admin"
            : role === "TEACHER"
              ? "/oqituvchi"
              : role === "STUDENT"
                ? "/oquvchi"
                : callbackUrl;
      router.push(dest);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error && err.message === "TIMEOUT" ? "So‘rov juda uzoq davom etdi. Qayta urinib ko‘ring." : "Kirishda xatolik yuz berdi. Sahifani yangilab qayta urinib ko‘ring.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-2xl shadow-emerald-900/10 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/90 dark:shadow-black/40 sm:p-8">
      <div className="mb-6 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg ring-1 ring-emerald-200/50 dark:ring-emerald-800/50">
          <LogIn className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Tizimga kirish</h2>
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">Email va parolingizni kiriting.</p>
        </div>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label htmlFor="identifier" className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <Mail className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            Email yoki ism-familiya
          </label>
          <input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            placeholder="siz@maktab.uz yoki Ism Familiya"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-teal-500/0 transition placeholder:text-slate-400 focus:border-emerald-400/80 focus:ring-4 focus:ring-teal-400/25 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <Lock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            Parol
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-teal-500/0 transition placeholder:text-slate-400 focus:border-emerald-400/80 focus:ring-4 focus:ring-teal-400/25 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </p>
        ) : null}
        {notice === "verified" ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/35 dark:text-emerald-200">
            Email tasdiqlandi. Endi tizimga kirishingiz mumkin.
          </p>
        ) : null}
        {notice === "verify-failed" ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/35 dark:text-amber-100">
            Tasdiqlash havolasi yaroqsiz yoki muddati tugagan. Qayta ro‘yxatdan o‘ting yoki administratorga murojaat qiling.
          </p>
        ) : null}
        {notice === "check-email" ? (
          <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/35 dark:text-sky-100">
            Email manzilingizni tekshiring — tasdiqlash havolasini yubordik.
          </p>
        ) : null}
        <Button type="submit" className="w-full py-3 text-base font-semibold" disabled={loading}>
          {loading ? "Kirilmoqda…" : "Kirish"}
        </Button>
      </form>
      <div className="mt-6 flex flex-col gap-2 text-center text-sm">
        {process.env.NEXT_PUBLIC_ENABLE_REGISTRATION !== "0" ? (
          <Link href="/register" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
            Ro‘yxatdan o‘tish
          </Link>
        ) : null}
        <Link href="/forgot-password" className="text-slate-600 hover:text-emerald-700 hover:underline dark:text-slate-400 dark:hover:text-emerald-400">
          Parolni unutdingizmi?
        </Link>
      </div>
    </div>
  );
}
