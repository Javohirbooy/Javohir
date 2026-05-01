"use client";

import { useActionState } from "react";
import { updateOwnCredentials, type SuperAdminAccountState } from "@/app/actions/super-admin-account";
import { Button } from "@/components/ui/button";

export function SuperAdminCredentialsForm({ initialEmail }: { initialEmail: string }) {
  const [state, action, pending] = useActionState(updateOwnCredentials, null as SuperAdminAccountState);

  return (
    <form action={action} className="mt-4 space-y-3">
      <div>
        <input
          name="email"
          type="email"
          defaultValue={initialEmail}
          placeholder="Yangi email"
          className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none ring-emerald-500/30 focus:ring-2"
        />
      </div>
      <div>
        <input
          name="currentPassword"
          type="password"
          placeholder="Joriy parol"
          className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none ring-emerald-500/30 focus:ring-2"
        />
      </div>
      <div>
        <input
          name="newPassword"
          type="password"
          placeholder="Yangi parol"
          className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none ring-emerald-500/30 focus:ring-2"
        />
      </div>

      {state?.error ? <p className="text-sm font-medium text-rose-700">{state.error}</p> : null}
      {state?.success ? <p className="text-sm font-medium text-emerald-700">{state.success}</p> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saqlanmoqda..." : "Login/parolni yangilash"}
      </Button>
    </form>
  );
}

