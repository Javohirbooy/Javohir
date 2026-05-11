"use client";

import { exportOlympiadResultsCsv } from "@/app/actions/olympiad-admin";
import { Button } from "@/components/ui/button";

export function OlympiadExportButton({ olympiadId }: { olympiadId: string }) {
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={async () => {
        const r = await exportOlympiadResultsCsv(olympiadId);
        if (!r.ok) return;
        const blob = new Blob([r.csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = r.filename;
        a.click();
        URL.revokeObjectURL(url);
      }}
    >
      Natijalarni CSV
    </Button>
  );
}
