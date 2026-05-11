"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
    Sentry.captureException(error, {
      tags: { error_boundary: "root_global" },
      fingerprint: error.digest ? ["global-error", error.digest] : ["global-error", "no-digest"],
    });
  }, [error]);

  return (
    <html lang="uz" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-950 text-slate-100" suppressHydrationWarning>
        <main
          role="alert"
          aria-live="assertive"
          className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center"
        >
          <h1 className="text-3xl font-extrabold">Tizimda jiddiy xatolik yuz berdi</h1>
          <p className="mt-3 text-sm text-slate-300">
            Iltimos, sahifani qayta yuklang yoki birozdan keyin qayta urinib ko‘ring.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-8 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Qayta urinish
          </button>
        </main>
      </body>
    </html>
  );
}
