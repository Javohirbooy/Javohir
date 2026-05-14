"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";

export type SegmentErrorVariant = "root" | "site" | "admin" | "teacher" | "student" | "super" | "workspace";

const COPY: Record<
  SegmentErrorVariant,
  { title: string; hint: string; panelLabel: string; panelHref: string }
> = {
  root: {
    title: "Kutilmagan xatolik yuz berdi",
    hint: "Sahifani qayta yuklang. Muammo davom etsa, Vercel funksiya jurnallari yoki /api/health holatini tekshiring.",
    panelLabel: "Bosh sahifa",
    panelHref: "/",
  },
  site: {
    title: "Sahifa yuklanmadi",
    hint: "Marketing yoki ochiq sahifada render xatosi. Keshni tozalab qayta urinib ko‘ring.",
    panelLabel: "Bosh sahifa",
    panelHref: "/",
  },
  admin: {
    title: "Admin panelida xatolik",
    hint: "Bu bo‘limdagi sahifa render qilinmadi. Jurnallarda xato vaqtini `digest` bilan qidiring.",
    panelLabel: "Admin bosh sahifa",
    panelHref: "/admin",
  },
  teacher: {
    title: "O‘qituvchi panelida xatolik",
    hint: "Panel sahifasini qayta yuklang. DB yoki ruxsatlar bilan bog‘liq bo‘lishi mumkin.",
    panelLabel: "O‘qituvchi paneli",
    panelHref: "/oqituvchi",
  },
  student: {
    title: "O‘quvchi panelida xatolik",
    hint: "Sessiya bor-yo‘qligini tekshiring. Muammo davom etsa, administratorga xabar bering.",
    panelLabel: "O‘quvchi paneli",
    panelHref: "/oquvchi",
  },
  super: {
    title: "Super admin panelida xatolik",
    hint: "Tizim darajasidagi sahifa yiqildi. Vercel loglari va migratsiyalarni tekshiring.",
    panelLabel: "Super admin",
    panelHref: "/super-admin",
  },
  workspace: {
    title: "Platform bo‘limida xatolik",
    hint: "Workspace / classroom sahifasida render xatosi.",
    panelLabel: "Workspace",
    panelHref: "/workspace",
  },
};

export function SegmentErrorUi({
  error,
  reset,
  variant,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  variant: SegmentErrorVariant;
}) {
  const c = COPY[variant];

  useEffect(() => {
    console.error("[segment-error]", variant, error);
    Sentry.captureException(error, {
      tags: { error_boundary: `segment_${variant}` },
      fingerprint: error.digest ? ["segment-error", variant, error.digest] : ["segment-error", variant, "no-digest"],
    });
  }, [error, variant]);

  return (
    <main
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center px-4 text-center"
    >
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{c.title}</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{c.hint}</p>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Agar muammo davom etsa, administrator{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">/api/health</code> orqali DB va muhit
        o‘zgaruvchilarini tekshirishi mumkin.
      </p>
      {error.digest ? (
        <p className="mt-4 font-mono text-xs text-slate-500 dark:text-slate-400" translate="no">
          Xato kodi (digest): {error.digest}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={reset} className="px-5">
          Qayta urinish
        </Button>
        <Button href="/api/health?ui=1" variant="outline" className="px-5">
          Holat
        </Button>
        <Button href={c.panelHref} variant="glass" className="px-5">
          {c.panelLabel}
        </Button>
        {variant !== "site" && variant !== "root" && variant !== "workspace" ? (
          <Link href="/" className="text-sm font-semibold text-emerald-700 underline underline-offset-2 dark:text-emerald-400">
            Saytga chiqish
          </Link>
        ) : null}
      </div>
    </main>
  );
}
