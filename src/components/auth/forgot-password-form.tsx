"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "@/app/actions/auth-public";
import { useToast } from "@/components/providers/toast-provider";
import { KeyRound, Mail } from "lucide-react";

export function ForgotPasswordForm() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await requestPasswordReset({ email });
    setLoading(false);
    if (!res.ok) {
      toast(res.error, "error");
      return;
    }
    setDone(true);
    toast("Agar email tizimda bo‘lsa, tiklash havolasi yuborildi.", "success");
    const dev = res.data?.devResetUrl;
    if (dev) toast(`Dev: ${dev}`, "info");
  }

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/90 sm:p-8">
      <div className="mb-6 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-lg">
          <KeyRound className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Parolni unutdingizmi?</h2>
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">Email manzilingizni kiriting.</p>
        </div>
      </div>

      {done ? (
        <p className="text-sm text-slate-700 dark:text-slate-300">
          So‘rov qabul qilindi. Bir necha daqiqa ichida pochtangizni tekshiring (spam / reklama ham). Xat kelmasa, keyinroq qayta urinib ko‘ring yoki administratorga murojaat qiling.
        </p>
      ) : (
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label htmlFor="fp-email" className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <Mail className="h-4 w-4 text-emerald-600" aria-hidden />
              Email
            </label>
            <input
              id="fp-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400/80 focus:ring-4 focus:ring-teal-400/25 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
          <Button type="submit" className="w-full py-3" disabled={loading}>
            {loading ? "Yuborilmoqda…" : "Tiklash havolasini yuborish"}
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link href="/kirish" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
          ← Kirish
        </Link>
      </p>
    </div>
  );
}
