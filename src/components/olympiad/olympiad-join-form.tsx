"use client";

import { useActionState, useEffect, useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { joinOlympiadFormAction, type JoinOlympiadResult } from "@/app/actions/olympiad-participant";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const BROWSER_DEVICE_ID_KEY = "iqm_olympiad_browser_id";

/** Har bir brauzer profili uchun barqaror ID (sinf kompyuterida ketma-ket o‘quvchilar bir-birini bloklamasligi uchun). */
function getOrCreateBrowserDeviceId(): string {
  try {
    let id = localStorage.getItem(BROWSER_DEVICE_ID_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `rnd-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(BROWSER_DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return `ephemeral-${Date.now()}`;
  }
}

function buildDeviceFingerprint(): string {
  if (typeof window === "undefined") return "";
  const parts: string[] = [];
  parts.push(getOrCreateBrowserDeviceId());
  try {
    parts.push(navigator.userAgent || "ua");
  } catch {
    parts.push("ua");
  }
  try {
    parts.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
  } catch {
    /* ignore */
  }
  try {
    parts.push(new Intl.DateTimeFormat().resolvedOptions().timeZone || "tz");
  } catch {
    parts.push("tz");
  }
  try {
    parts.push(navigator.language || "lang");
  } catch {
    parts.push("lang");
  }
  return parts.join("|");
}

function writeDeviceFingerprintToInput(el: HTMLInputElement | null) {
  if (!el) return;
  el.value = buildDeviceFingerprint();
}

export function OlympiadJoinForm() {
  const router = useRouter();
  const fpRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState(
    async (prev: JoinOlympiadResult | null, formData: FormData) => {
      const fp = buildDeviceFingerprint();
      if (fp) formData.set("deviceFp", fp);
      return joinOlympiadFormAction(prev, formData);
    },
    null as JoinOlympiadResult | null,
  );

  useLayoutEffect(() => {
    writeDeviceFingerprintToInput(fpRef.current);
  }, []);

  useEffect(() => {
    if (!state?.ok) return;
    if (state.kind === "bundle") {
      window.location.assign("/olympiada/bundle");
      return;
    }
    router.push("/olympiada/rules");
  }, [state, router]);

  return (
    <Card className="border-white/20 bg-white/95 p-5 shadow-2xl sm:p-8">
      <form
        action={formAction}
        className="space-y-4"
        onSubmit={() => {
          writeDeviceFingerprintToInput(fpRef.current);
        }}
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
