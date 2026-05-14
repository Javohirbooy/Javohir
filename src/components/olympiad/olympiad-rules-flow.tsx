"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { acceptOlympiadRules } from "@/app/actions/olympiad-participant";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function OlympiadRulesFlow({
  title,
  durationMinutes,
  antiCheatStrictness,
}: {
  title: string;
  durationMinutes: number;
  antiCheatStrictness: string;
}) {
  const router = useRouter();
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Card className="border-white/20 bg-white/95 p-5 shadow-2xl sm:p-8">
      <h1 className="text-xl font-bold text-slate-900">Qoidalar: {title}</h1>
      <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-slate-700">
        <li>Test boshlangach taymer server vaqtiga bog&apos;langan — faqat mijoz vaqtiga ishonmang.</li>
        <li>Har bir savol uchun bitta javob tanlanadi; javoblar avtomatik saqlanadi.</li>
        <li>Test davomiyligi: {durationMinutes} daqiqa.</li>
        <li>
          Anticheat:{" "}
          {antiCheatStrictness === "STRICT"
            ? "qattiq (varaq almashtirish, nusxa va to‘liq ekran cheklovlari qayd etiladi)."
            : antiCheatStrictness === "OFF"
              ? "o‘chirilgan."
              : "standart (shubhali harakatlar qayd etiladi)."}
        </li>
        <li>Yangi varaq ochish, nusxa ko‘chirish va to‘liq ekrandan chiqish platforma tomonidan yozib olinishi mumkin.</li>
        <li>Natijalar olimpiada sozlamalariga qarab kechiktirilgan holda e&apos;lon qilinishi mumkin.</li>
      </ul>

      <div className="mt-6 flex min-h-[44px] flex-wrap items-start gap-3 rounded-xl py-1">
        <input
          id="ol-rules-agree"
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-1.5 h-5 w-5 shrink-0 rounded border-slate-300 text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70"
        />
        <label htmlFor="ol-rules-agree" className="text-sm font-medium text-slate-800">
          Men qoidalarni o‘qidim va roziman.
        </label>
      </div>

      {err ? (
        <p className="mt-3 text-sm text-rose-600" role="alert">
          {err}
        </p>
      ) : null}

      <Button
        type="button"
        className="mt-6 min-h-[48px]"
        disabled={!agree || pending}
        onClick={() => {
          setErr(null);
          start(async () => {
            const r = await acceptOlympiadRules();
            if (!r.ok) {
              setErr(r.error ?? "Xato");
              return;
            }
            router.push("/olympiada/waiting-room");
          });
        }}
      >
        {pending ? "Saqlanmoqda…" : "Kutish xonasiga o‘tish"}
      </Button>
    </Card>
  );
}
