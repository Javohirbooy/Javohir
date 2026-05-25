"use client";

import { useTransition } from "react";
import {
  natijalarCsvFilename,
  parseCsvContentDispositionFilename,
} from "@/lib/olympiad/olympiad-results-csv-format";
import { Button } from "@/components/ui/button";

export function OlympiadResultsCsvExportButton({
  filters,
}: {
  filters: { olympiadId?: string; gradeLabel?: string; school?: string; name?: string };
}) {
  const [pending, start] = useTransition();

  function download() {
    start(async () => {
      const params = new URLSearchParams();
      if (filters.olympiadId?.trim()) params.set("olympiadId", filters.olympiadId.trim());
      if (filters.gradeLabel?.trim()) params.set("gradeLabel", filters.gradeLabel.trim());
      if (filters.school?.trim()) params.set("school", filters.school.trim());
      if (filters.name?.trim()) params.set("name", filters.name.trim());
      const qs = params.toString();
      const res = await fetch(`/api/olympiad/admin/export-results-csv${qs ? `?${qs}` : ""}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        window.alert(j?.error === "forbidden" ? "Ruxsat yo‘q." : j?.error === "rate_limited" ? "Juda tez-tez yuklab oldingiz." : "CSV yuklanmadi.");
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
    });
  }

  return (
    <Button type="button" variant="secondary" disabled={pending} onClick={download}>
      {pending ? "Tayyorlanmoqda…" : "CSV eksport"}
    </Button>
  );
}
