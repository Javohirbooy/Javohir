"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { joinOlympiadFormAction, type JoinOlympiadResult } from "@/app/actions/olympiad-participant";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function buildDeviceFingerprint() {
  if (typeof window === "undefined") return "";
  try {
    return [
      navigator.userAgent,
      String(screen.width),
      String(screen.height),
      String(screen.colorDepth),
      new Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.language,
    ].join("|");
  } catch {
    return "";
  }
}

export function OlympiadJoinForm() {
  const router = useRouter();
  const fpRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState(joinOlympiadFormAction, null as JoinOlympiadResult | null);

  useEffect(() => {
    if (fpRef.current) fpRef.current.value = buildDeviceFingerprint();
  }, []);

  useEffect(() => {
    if (state?.ok) router.push("/olympiada/rules");
  }, [state, router]);

  return (
    <Card className="border-white/20 bg-white/95 p-5 shadow-2xl sm:p-8">
      <form
        action={formAction}
        className="space-y-4"
      >
        <input ref={fpRef} type="hidden" name="deviceFp" defaultValue="" />
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="sr-only" aria-hidden />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ol-first" className="text-sm font-semibold text-slate-800">
              Ism
            </label>
            <input
              id="ol-first"
              name="firstName"
              required
              autoComplete="given-name"
              className={cn(
                "mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none ring-sky-500/30 focus-visible:ring-2",
              )}
            />
          </div>
          <div>
            <label htmlFor="ol-last" className="text-sm font-semibold text-slate-800">
              Familiya
            </label>
            <input
              id="ol-last"
              name="lastName"
              required
              autoComplete="family-name"
              className={cn(
                "mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none ring-sky-500/30 focus-visible:ring-2",
              )}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ol-grade" className="text-sm font-semibold text-slate-800">
              Sinf
            </label>
            <input
              id="ol-grade"
              name="gradeLabel"
              required
              placeholder="Masalan: 8-A"
              className={cn(
                "mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none ring-sky-500/30 focus-visible:ring-2",
              )}
            />
          </div>
          <div>
            <label htmlFor="ol-age" className="text-sm font-semibold text-slate-800">
              Yosh
            </label>
            <input
              id="ol-age"
              name="age"
              type="number"
              inputMode="numeric"
              min={6}
              max={99}
              required
              className={cn(
                "mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none ring-sky-500/30 focus-visible:ring-2",
              )}
            />
          </div>
        </div>

        <div>
          <label htmlFor="ol-school" className="text-sm font-semibold text-slate-800">
            Maktab
          </label>
          <input
            id="ol-school"
            name="schoolName"
            required
            autoComplete="organization"
            className={cn(
              "mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none ring-sky-500/30 focus-visible:ring-2",
            )}
          />
        </div>

        <div>
          <label htmlFor="ol-region" className="text-sm font-semibold text-slate-800">
            Hudud / tuman
          </label>
          <input
            id="ol-region"
            name="region"
            required
            className={cn(
              "mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none ring-sky-500/30 focus-visible:ring-2",
            )}
          />
        </div>

        <div>
          <label htmlFor="ol-phone" className="text-sm font-semibold text-slate-800">
            Telefon (ixtiyoriy)
          </label>
          <input
            id="ol-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            className={cn(
              "mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none ring-sky-500/30 focus-visible:ring-2",
            )}
          />
        </div>

        <div>
          <label htmlFor="ol-code" className="text-sm font-semibold text-slate-800">
            Olimpiada kodi
          </label>
          <input
            id="ol-code"
            name="accessCode"
            required
            autoComplete="one-time-code"
            className={cn(
              "mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono text-slate-900 outline-none ring-sky-500/30 focus-visible:ring-2",
            )}
            placeholder="OLYMPIADA-8A-2026"
          />
        </div>

        {state && !state.ok ? (
          <p className="text-sm font-medium text-rose-600" role="alert">
            {state.error}
          </p>
        ) : null}

        <Button type="submit" disabled={pending} className="min-h-[48px] w-full sm:w-auto">
          {pending ? "Jo‘natilmoqda…" : "Davom etish"}
        </Button>
      </form>
    </Card>
  );
}
