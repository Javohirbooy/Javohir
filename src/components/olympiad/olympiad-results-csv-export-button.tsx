"use client";

import { useTransition } from "react";
import { exportAdminOlympiadResultsCsv } from "@/app/actions/olympiad-admin";
import { Button } from "@/components/ui/button";

export function OlympiadResultsCsvExportButton({
  filters,
}: {
  filters: { olympiadId?: string; gradeLabel?: string; school?: string; name?: string };
}) {
  const [pending, start] = useTransition();

  function download() {
    start(async () => {
      const r = await exportAdminOlympiadResultsCsv(filters);
      if (!r.ok) {
        window.alert(r.error);
        return;
      }
      const blob = new Blob([r.csvText], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "olimpiada-natijalari.csv";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <Button type="button" variant="secondary" disabled={pending} onClick={download}>
      {pending ? "Tayyorlanmoqda…" : "CSV eksport"}
    </Button>
  );
}
