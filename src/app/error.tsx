"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error);
    Sentry.captureException(error, {
      tags: { error_boundary: "app_segment" },
      fingerprint: error.digest ? ["app-error", error.digest] : ["app-error", "no-digest"],
    });
  }, [error]);

  return (
    <main
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center px-4 text-center"
    >
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Kutilmagan xatolik yuz berdi</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Sahifani qayta yuklashga urinib ko‘ring. Muammo davom etsa, administratorga murojaat qiling (Vercel funksiya
        jurnallari yoki <code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-800">/api/health</code>{" "}
        holati foydali).
      </p>
      {error.digest ? (
        <p className="mt-4 font-mono text-xs text-slate-500 dark:text-slate-400" translate="no">
          Xato kodi: {error.digest}
        </p>
      ) : null}
      <Button onClick={reset} className="mt-6 px-5">
        Qayta urinish
      </Button>
    </main>
  );
}
