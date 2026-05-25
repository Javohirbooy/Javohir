"use client";

import { useState } from "react";
import {
  natijalarCsvFilename,
  parseCsvContentDispositionFilename,
} from "@/lib/olympiad/olympiad-results-csv-format";
import { Button } from "@/components/ui/button";

export function OlympiadExportButton({ olympiadId }: { olympiadId: string }) {
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="secondary"
        onClick={async () => {
          setErr(null);
          try {
            const res = await fetch(`/api/olympiad/${olympiadId}/export-csv`, { cache: "no-store", credentials: "same-origin" });
            if (!res.ok) {
              const j = (await res.json().catch(() => null)) as { error?: string } | null;
              setErr(j?.error === "forbidden" ? "Ruxsat yo‘q." : "CSV yuklanmadi.");
              return;
            }
            const blob = await res.blob();
            const fallback = natijalarCsvFilename();
            const filename = parseCsvContentDispositionFilename(res.headers.get("Content-Disposition"), fallback);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.rel = "noopener";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
          } catch {
            setErr("Tarmoq xatosi.");
          }
        }}
      >
        Natijalarni CSV
      </Button>
      {err ? (
        <p className="text-xs text-rose-600" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}
