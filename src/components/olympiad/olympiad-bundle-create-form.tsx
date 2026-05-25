"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  createOlympiadBundleAction,
  type BundleTestPickerItem,
} from "@/app/actions/olympiad-bundle-admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function OlympiadBundleCreateForm({
  tests,
  basePath,
}: {
  tests: BundleTestPickerItem[];
  basePath: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    async (_prev: { ok: false; error: string } | { ok: true; bundleId: string } | null, fd: FormData) => {
      const r = await createOlympiadBundleAction(fd);
      if (r.ok) router.push(`${basePath}/bundle/${r.bundleId}`);
      return r;
    },
    null,
  );

  return (
    <Card className="p-6">
      <form action={action} className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-slate-800">Paket nomi</label>
          <input name="title" required className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-800">Kirish kodi</label>
          <input
            name="plainCode"
            required
            placeholder="FINAL2026"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono uppercase"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-800">Boshlanish</label>
            <input name="startsAt" type="datetime-local" required className="mt-1 w-full rounded-xl border px-3 py-2.5" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-800">Yakun (ixtiyoriy)</label>
            <input name="endsAt" type="datetime-local" className="mt-1 w-full rounded-xl border px-3 py-2.5" />
          </div>

        </div>
        <fieldset>
          <legend className="text-sm font-semibold text-slate-800">Testlar</legend>
          <p className="mt-1 text-xs text-slate-500">
            Nashr qilingan barcha testlar. Tanlangan har biri uchun olimpiada yaratiladi (yoki mavjudi ishlatiladi).
            Bir xil imtihonning 1- va 2-variant testlarini ikkalasini ham qo‘shsangiz, har o‘quvchiga faqat bitta
            variant avtomatik biriktiriladi (yonma-yon o‘tirishda bir xil variant chiqmasligi uchun).
          </p>
          {tests.length === 0 ? (
            <p className="mt-2 text-sm text-amber-800">Nashr qilingan test topilmadi.</p>
          ) : null}
          <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
            {tests.map((t) => (
              <li key={t.testId}>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input type="checkbox" name="testId" value={t.testId} className="mt-1 min-h-[18px] min-w-[18px]" />
                  <span>
                    <span className="font-medium text-slate-900">{t.title}</span>
                    <span className="block text-xs text-slate-500">
                      {t.subjectTitle ?? "Fan"}
                      {t.gradeNumber != null ? ` · ${t.gradeNumber}-sinf` : ""}
                      {` · ${t.questionCount} savol`}
                      {t.hasOlympiad ? " · olimpiada bor" : " · yangi olimpiada"}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        {state && !state.ok ? <p className="text-sm text-rose-600">{state.error}</p> : null}
        <Button type="submit" disabled={pending} className="min-h-11">
          {pending ? "Saqlanmoqda…" : "Paket yaratish"}
        </Button>
      </form>
    </Card>
  );
}
