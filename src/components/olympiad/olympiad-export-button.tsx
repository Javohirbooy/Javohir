"use client";

import { useState } from "react";
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
            const cd = res.headers.get("Content-Disposition");
            const m = cd?.match(/filename="([^"]+)"/);
            const filename = m?.[1] ?? `olympiad-${olympiadId}.csv`;
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.click();
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
