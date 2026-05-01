"use client";

import { useActionState } from "react";
import { submitTestCode } from "@/app/actions/test-code";
import type { TestCodeFormState } from "@/lib/test-access";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function TestCodeForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(submitTestCode, null as TestCodeFormState);

  return (
    <Card className="border-white/15 bg-white/[0.06] p-6 text-white shadow-xl backdrop-blur-xl sm:p-8">
      <h2 className="text-lg font-bold">Test kodini kiriting</h2>
      <p className="mt-2 text-sm text-white/60">O‘qituvchi bergan kodni yozing. Kod tasdiqlangach, test ochiladi.</p>
      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <div>
          <label htmlFor="code" className="text-xs font-semibold uppercase tracking-wider text-white/50">
            Test kodi
          </label>
          <input
            id="code"
            name="code"
            autoComplete="off"
            placeholder="Masalan: G5-DEMO"
            className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white outline-none ring-cyan-500/0 transition placeholder:text-white/35 focus:ring-4 focus:ring-cyan-400/25"
          />
        </div>
        {state?.error ? <p className="text-sm font-medium text-rose-300">{state.error}</p> : null}
        <Button type="submit" className="w-full py-3" disabled={pending}>
          {pending ? "Tekshirilmoqda…" : "Testni ochish"}
        </Button>
      </form>
    </Card>
  );
}
