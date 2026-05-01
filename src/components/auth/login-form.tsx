"use client";

import { useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
    <Card className="mx-auto max-w-md border-slate-200/80 bg-white/95 text-slate-900 shadow-2xl shadow-violet-900/20 backdrop-blur-xl">
      <h1 className="text-2xl font-extrabold text-slate-900">Kabinetga kirish</h1>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-teal-500/0 transition focus:ring-4 focus:ring-teal-400/30"
          />
        </div>
        <div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Parol"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-teal-500/0 transition focus:ring-4 focus:ring-teal-400/30"
          />
        </div>
        {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
        <Button type="submit" className="w-full py-3 text-base" disabled={loading}>
          {loading ? "Kirilmoqda…" : "Kirish"}
        </Button>
      </form>
    </Card>
  );
}
