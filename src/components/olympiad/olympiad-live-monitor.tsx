"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Row = {
  sessionId: string;
  status: "active" | "disconnected" | "suspicious";
  sessionStatus: string;
  participant: { firstName: string; lastName: string; gradeLabel: string };
  warningCount: number;
  suspiciousScore: number;
  lastSeenAt: string;
  violations: { type: string; at: string }[];
};

export function OlympiadLiveMonitor({ olympiadId }: { olympiadId: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [updated, setUpdated] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/olympiad/monitor/${olympiadId}`, { cache: "no-store" });
        if (!res.ok) {
          setErr("Monitoring yuklanmadi.");
          return;
        }
        const j = (await res.json()) as { participants?: Row[]; serverNow?: string };
        setRows(j.participants ?? []);
        setUpdated(j.serverNow ?? new Date().toISOString());
        setErr(null);
      } catch {
        setErr("Tarmoq xatosi.");
      }
    };
    void load();
    const id = window.setInterval(() => void load(), 5000);
    return () => clearInterval(id);
  }, [olympiadId]);

  if (err) {
    return (
      <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {err}
      </Card>
    );
  }
  if (!rows) {
    return <p className="text-sm text-slate-600">Jonli ma’lumot yuklanmoqda…</p>;
  }

  return (
    <div className="space-y-3">
      {updated ? (
        <p className="text-xs text-slate-500" aria-live="polite">
          Yangilandi: {new Date(updated).toLocaleString()}
        </p>
      ) : null}
      <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
        {rows.length === 0 ? <p className="text-sm text-slate-600">Hozircha sessiyalar yo‘q.</p> : null}
        {rows.map((r) => (
          <Card key={r.sessionId} className="border-slate-200 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-slate-900">
                {r.participant.firstName} {r.participant.lastName}{" "}
                <span className="font-normal text-slate-600">({r.participant.gradeLabel})</span>
              </p>
              <StatusBadge status={r.status} />
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Holat: {r.sessionStatus} · ogohlantirish: {r.warningCount} · shubxa ball: {r.suspiciousScore}
            </p>
            {r.violations.length ? (
              <ul className="mt-2 list-inside list-disc text-xs text-slate-600">
                {r.violations.slice(0, 3).map((v) => (
                  <li key={`${v.type}-${v.at}`}>
                    {v.type} — {new Date(v.at).toLocaleTimeString()}
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Row["status"] }) {
  if (status === "active") {
    return <Badge className="border-emerald-300 bg-emerald-100 text-emerald-900">🟢 Faol</Badge>;
  }
  if (status === "suspicious") {
    return <Badge className="border-amber-300 bg-amber-100 text-amber-950">🟡 Shubhali</Badge>;
  }
  return <Badge className="border-rose-300 bg-rose-100 text-rose-900">🔴 Uzilgan</Badge>;
}
