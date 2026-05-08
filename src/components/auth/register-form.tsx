"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { registerStudent } from "@/app/actions/auth-public";
import { useToast } from "@/components/providers/toast-provider";
import { LogIn, Mail, Lock, User } from "lucide-react";

export function RegisterForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await registerStudent({ name, email, password });
    setLoading(false);
    if (!res.ok) {
      toast(res.error, "error");
      return;
    }
    toast("Ro‘yxatdan o‘tdingiz. Emaildagi havolani tasdiqlang.", "success");
    const dev = res.data?.devVerifyUrl;
    if (dev) {
      toast(`Dev: ${dev}`, "info");
    }
    router.push("/kirish?notice=check-email");
    router.refresh();
  }

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-2xl shadow-emerald-900/10 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/90 dark:shadow-black/40 sm:p-8">
      <div className="mb-6 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg ring-1 ring-emerald-200/50 dark:ring-emerald-800/50">
          <LogIn className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Ro‘yxatdan o‘tish</h2>
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">O‘quvchi sifatida akkaunt yarating.</p>
        </div>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label htmlFor="reg-name" className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            Ism familiya
          </label>
          <input
            id="reg-name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400/80 focus:ring-4 focus:ring-teal-400/25 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="reg-email" className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <Mail className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            Email
          </label>
          <input
            id="reg-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400/80 focus:ring-4 focus:ring-teal-400/25 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="reg-password" className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <Lock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            Parol (kamida 8 belgi)
          </label>
          <input
            id="reg-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400/80 focus:ring-4 focus:ring-teal-400/25 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
        <Button type="submit" className="w-full py-3 text-base font-semibold" disabled={loading}>
          {loading ? "Yaratilmoqda…" : "Ro‘yxatdan o‘tish"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        Allaqachon akkauntingiz bormi?{" "}
        <Link href="/kirish" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
          Kirish
        </Link>
      </p>
    </div>
  );
}
