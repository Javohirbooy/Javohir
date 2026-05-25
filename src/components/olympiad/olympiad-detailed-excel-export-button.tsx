"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export function OlympiadDetailedExcelExportButton({
  olympiadId: fixedOlympiadId,
  filters = {},
}: {
  /** Olimpiada sahifasidan — filtrsiz ham ishlaydi */
  olympiadId?: string;
  filters?: { olympiadId?: string; gradeLabel?: string; school?: string; name?: string };
}) {
  const [pending, start] = useTransition();

  function download() {
    start(async () => {
      const oid = (fixedOlympiadId ?? filters.olympiadId)?.trim();
      const params = new URLSearchParams();
      if (oid) params.set("olympiadId", oid);
      if (filters.gradeLabel?.trim()) params.set("gradeLabel", filters.gradeLabel.trim());
      if (filters.school?.trim()) params.set("school", filters.school.trim());
      if (filters.name?.trim()) params.set("name", filters.name.trim());
      const qs = params.toString();
      const res = await fetch(
        `/api/olympiad/admin/export-detailed-xlsx${qs ? `?${qs}` : ""}`,
        { cache: "no-store", credentials: "same-origin" },
      );
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        const msg =
          j?.error === "forbidden"
            ? "Ruxsat yo‘q."
            : j?.error === "rate_limited"
              ? "Juda tez-tez yuklab oldingiz. Biroz kuting."
              : j?.error === "no_results"
                ? "Natija topilmadi. Filtrlarni tekshiring."
                : "Excel yuklanmadi.";
        window.alert(msg);
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition");
      const m = cd?.match(/filename="([^"]+)"/);
      const filename = m?.[1] ?? `imtihon-tahlil-${new Date().toISOString().slice(0, 10)}.xlsx`;
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
    <Button type="button" variant="primary" disabled={pending} onClick={download}>
      {pending ? "Excel tayyorlanmoqda…" : "Excel: umumiy, savollar, javoblar"}
    </Button>
  );
}
