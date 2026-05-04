"use client";

import { useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogIn, Mail, Lock } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (process.env.NEXT_PUBLIC_AUTH_DEBUG === "1") {
      console.info("[iqm-login] submit", { email, hasPassword: password.length > 0 });
    }
    const res = await signIn("credentials", { email, password, redirect: false });
    if (process.env.NEXT_PUBLIC_AUTH_DEBUG === "1") {
      console.info("[iqm-login] signIn result", { ok: res?.ok, error: res?.error, status: res?.status, url: res?.url });
    }
    setLoading(false);
    if (res?.error) {
      setError("Email yoki parol noto‘g‘ri.");
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
          <label htmlFor="email" className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <Mail className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="siz@maktab.uz"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
        <Button type="submit" className="w-full py-3 text-base font-semibold" disabled={loading}>
          {loading ? "Kirilmoqda…" : "Kirish"}
        </Button>
      </form>
    </div>
  );
}
