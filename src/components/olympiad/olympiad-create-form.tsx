"use client";

import { createOlympiadAction } from "@/app/actions/olympiad-admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

type CreateState = { ok: true; id: string } | { ok: false; error: string } | null;

export function OlympiadCreateForm({
  tests,
  basePath,
}: {
  tests: { id: string; title: string }[];
  basePath: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createOlympiadAction, null as CreateState);

  useEffect(() => {
    if (state && "ok" in state && state.ok && state.id) {
      router.push(`${basePath}/${state.id}`);
    }
  }, [state, router, basePath]);

  return (
    <Card className="border-slate-200 bg-white p-6 shadow-md">
      <form action={formAction} className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-slate-800" htmlFor="ol-cr-title">
            Sarlavha
          </label>
          <input
            id="ol-cr-title"
            name="title"
            required
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-800" htmlFor="ol-cr-desc">
            Tavsif
          </label>
          <textarea id="ol-cr-desc" name="description" rows={3} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-800" htmlFor="ol-cr-test">
            Test
          </label>
          <select id="ol-cr-test" name="testId" required className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900">
            <option value="">— tanlang —</option>
            {tests.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-800" htmlFor="ol-cr-start">
              Boshlanish
            </label>
            <input id="ol-cr-start" name="startsAt" type="datetime-local" required className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-800" htmlFor="ol-cr-end">
              Yakun (ixtiyoriy)
            </label>
            <input id="ol-cr-end" name="endsAt" type="datetime-local" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-800" htmlFor="ol-cr-dur">
              Davomiylik (daq)
            </label>
            <input
              id="ol-cr-dur"
              name="durationMinutes"
              type="number"
              min={5}
              max={300}
              defaultValue={60}
              required
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-800" htmlFor="ol-cr-limit">
              Ishtirokchi limiti (bo‘sh = cheksiz)
            </label>
            <input id="ol-cr-limit" name="participantLimit" type="number" min={1} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-800" htmlFor="ol-cr-ac">
              Anticheat
            </label>
            <select id="ol-cr-ac" name="antiCheatStrictness" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" defaultValue="STANDARD">
              <option value="OFF">O‘chiq</option>
              <option value="STANDARD">Standart</option>
              <option value="STRICT">Qattiq</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-800" htmlFor="ol-cr-rv">
              Natija ko‘rinishi
            </label>
            <select id="ol-cr-rv" name="resultVisibility" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" defaultValue="DELAYED">
              <option value="DELAYED">Kechiktirilgan</option>
              <option value="IMMEDIATE">Darhol</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-800">
            <input type="checkbox" name="shuffleQuestions" value="on" defaultChecked className="h-4 w-4 rounded" />
            Savollarni aralashtirish
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-800">
            <input type="checkbox" name="shuffleOptions" value="on" defaultChecked className="h-4 w-4 rounded" />
            Javoblarni aralashtirish
          </label>
        </div>
        {state && "ok" in state && !state.ok ? <p className="text-sm text-rose-600">{state.error}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Saqlanmoqda…" : "Yaratish"}
        </Button>
      </form>
    </Card>
  );
}
