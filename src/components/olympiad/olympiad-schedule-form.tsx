"use client";

import { updateOlympiadScheduleAction } from "@/app/actions/olympiad-admin";
import { Button } from "@/components/ui/button";
import { datetimeLocalValueToUtcIso, formatDateForDatetimeLocal } from "@/lib/datetime-local";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

type ScheduleState = null | { ok: true } | { ok: false; error: string };

function isoToDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return formatDateForDatetimeLocal(d);
}

export function OlympiadScheduleForm({
  olympiadId,
  startsAtIso,
  endsAtIso,
}: {
  olympiadId: string;
  startsAtIso: string;
  endsAtIso: string | null;
}) {
  const router = useRouter();
  const [startsAt, setStartsAt] = useState(() => isoToDatetimeLocalValue(startsAtIso));
  const [endsAt, setEndsAt] = useState(() => (endsAtIso ? isoToDatetimeLocalValue(endsAtIso) : ""));

  const [state, formAction, pending] = useActionState(
    async (prev: ScheduleState, fd: FormData) => {
      const s = String(fd.get("startsAt") ?? "");
      const iso = datetimeLocalValueToUtcIso(s);
      if (iso) fd.set("startsAt", iso);
      const e = String(fd.get("endsAt") ?? "").trim();
      if (e) {
        const isoE = datetimeLocalValueToUtcIso(e);
        if (isoE) fd.set("endsAt", isoE);
      }
      return updateOlympiadScheduleAction(prev, fd);
    },
    null as ScheduleState,
  );

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <input type="hidden" name="olympiadId" value={olympiadId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold text-slate-800" htmlFor={`ol-ed-start-${olympiadId}`}>
            Boshlanish (mahalliy vaqt)
          </label>
          <input
            id={`ol-ed-start-${olympiadId}`}
            name="startsAt"
            type="datetime-local"
            required
            autoComplete="off"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-800" htmlFor={`ol-ed-end-${olympiadId}`}>
            Yakun (ixtiyoriy, mustaqil)
          </label>
          <input
            id={`ol-ed-end-${olympiadId}`}
            name="endsAt"
            type="datetime-local"
            autoComplete="off"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
          />
        </div>
      </div>
      {state && !state.ok ? <p className="text-sm text-rose-600">{state.error}</p> : null}
      {state && state.ok ? <p className="text-sm text-emerald-700">Jadval yangilandi.</p> : null}
      <Button type="submit" disabled={pending} variant="secondary">
        {pending ? "Saqlanmoqda…" : "Vaqlarni saqlash"}
      </Button>
    </form>
  );
}
