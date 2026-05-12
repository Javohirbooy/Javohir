"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

type MonitorEvent = {
  type: string;
  ts: number;
  sessionId?: string;
  meta?: Record<string, unknown>;
};

type SnapshotJson = {
  participants?: Row[];
  serverNow?: string;
  pagination?: { nextCursor?: string | null };
  events?: MonitorEvent[];
};

async function fetchJson(olympiadId: string, cursor: string | null): Promise<SnapshotJson | null> {
  const u = new URL(`/api/olympiad/monitor/${olympiadId}`, window.location.origin);
  u.searchParams.set("limit", "80");
  u.searchParams.set("violationLimit", "6");
  if (cursor) u.searchParams.set("cursor", cursor);
  const res = await fetch(u.toString(), { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as SnapshotJson;
}

export function OlympiadLiveMonitor({
  olympiadId,
  monitorSseEnabled,
}: {
  olympiadId: string;
  monitorSseEnabled: boolean;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [updated, setUpdated] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [eventFeed, setEventFeed] = useState<MonitorEvent[]>([]);
  const esRef = useRef<EventSource | null>(null);

  const mergeRows = useCallback((prev: Row[] | null, incoming: Row[], append: boolean) => {
    if (!append || !prev?.length) return incoming;
    const seen = new Set(prev.map((r) => r.sessionId));
    const merged = [...prev];
    for (const r of incoming) {
      if (!seen.has(r.sessionId)) {
        merged.push(r);
        seen.add(r.sessionId);
      }
    }
    return merged;
  }, []);

  const applySnapshot = useCallback(
    (j: SnapshotJson | null, append: boolean) => {
      if (!j?.participants) return false;
      setRows((prev) => mergeRows(prev, j.participants!, append));
      setUpdated(j.serverNow ?? new Date().toISOString());
      setNextCursor(j.pagination?.nextCursor ?? null);
      return true;
    },
    [mergeRows],
  );

  useEffect(() => {
    setRows(null);
    setErr(null);
    setNextCursor(null);
    setEventFeed([]);
  }, [olympiadId]);

  useEffect(() => {
    let cancelled = false;

    const loadFirst = async () => {
      const j = await fetchJson(olympiadId, null);
      if (cancelled) return;
      if (!applySnapshot(j, false)) {
        setErr("Monitoring yuklanmadi.");
        return;
      }
      setErr(null);
    };

    void loadFirst();

    if (monitorSseEnabled) {
      const es = new EventSource(`/api/olympiad/monitor/${olympiadId}/stream`);
      esRef.current = es;
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as {
            type?: string;
            participants?: Row[];
            serverNow?: string;
            pagination?: { nextCursor?: string | null };
            events?: MonitorEvent[];
          };
          if (msg.type === "events" && Array.isArray(msg.events)) {
            setEventFeed((prev) => {
              const next = [...(msg.events as MonitorEvent[]), ...prev];
              return next.slice(0, 80);
            });
          }
          if (msg.type === "snapshot" && msg.participants) {
            setRows(msg.participants);
            setUpdated(msg.serverNow ?? new Date().toISOString());
            setNextCursor(msg.pagination?.nextCursor ?? null);
            setErr(null);
          }
        } catch {
          /* ignore */
        }
      };
      es.onerror = () => {
        setErr((e) => (e ? e : "SSE uzildi."));
      };
      return () => {
        cancelled = true;
        es.close();
        esRef.current = null;
      };
    } else {
      const pollMs = 12_000;
      const id = window.setInterval(() => void loadFirst(), pollMs);
      return () => {
        cancelled = true;
        window.clearInterval(id);
      };
    }
  }, [olympiadId, monitorSseEnabled, applySnapshot]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const j = await fetchJson(olympiadId, nextCursor);
      if (j) applySnapshot(j, true);
    } finally {
      setLoadingMore(false);
    }
  }

  if (err && !rows?.length) {
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
          {monitorSseEnabled ? <span className="ml-2 text-emerald-700"> · SSE</span> : null}
        </p>
      ) : null}
      {eventFeed.length ? (
        <Card className="border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-800">
          <p className="font-semibold text-slate-900">Redis voqealar (so‘nggi)</p>
          <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto font-mono text-[0.7rem] text-slate-700">
            {eventFeed.slice(0, 24).map((e, i) => (
              <li key={`${e.ts}-${e.type}-${i}`}>
                {new Date(e.ts).toLocaleTimeString()} · {e.type}
                {e.sessionId ? ` · ${e.sessionId.slice(0, 8)}…` : ""}
                {e.meta && typeof e.meta.seq === "number" ? ` · seq ${e.meta.seq}` : ""}
              </li>
            ))}
          </ul>
        </Card>
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
                {r.violations.slice(0, 3).map((v, idx) => (
                  <li key={`${r.sessionId}-${v.type}-${v.at}-${idx}`}>
                    {v.type} — {new Date(v.at).toLocaleTimeString()}
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        ))}
      </div>
      {nextCursor ? (
        <Button type="button" variant="secondary" className="text-xs" disabled={loadingMore} onClick={() => void loadMore()}>
          {loadingMore ? "Yuklanmoqda…" : "Yana ko‘rsatish"}
        </Button>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: Row["status"] }) {
  if (status === "active") {
    return (
      <Badge className="border-emerald-300 bg-emerald-100 text-emerald-900" aria-label="Holat: faol">
        Faol
      </Badge>
    );
  }
  if (status === "suspicious") {
    return (
      <Badge className="border-amber-300 bg-amber-100 text-amber-950" aria-label="Holat: shubhali">
        Shubhali
      </Badge>
    );
  }
  return (
    <Badge className="border-rose-300 bg-rose-100 text-rose-900" aria-label="Holat: uzilgan">
      Uzilgan
    </Badge>
  );
}
