"use client";

import { memo, useCallback, useEffect, useState } from "react";
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

const SSE_MAX_ATTEMPTS = 14;

function eventDedupeKey(e: MonitorEvent): string {
  return `${e.ts}|${e.type}|${e.sessionId ?? ""}`;
}

async function fetchJson(olympiadId: string, cursor: string | null): Promise<SnapshotJson | null> {
  const u = new URL(`/api/olympiad/monitor/${olympiadId}`, window.location.origin);
  u.searchParams.set("limit", "80");
  u.searchParams.set("violationLimit", "6");
  if (cursor) u.searchParams.set("cursor", cursor);
  const res = await fetch(u.toString(), { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as SnapshotJson;
}

type SseMetrics = {
  tickDurationMs?: number;
  avgTickDurationMs?: number;
  snapshotLatencyMs?: number;
  avgSnapshotLatencyMs?: number;
  redisUnavailable?: boolean;
  droppedEvents?: number;
  tick?: number;
};

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
  /** WHY: Redis outage is surfaced explicitly so admins do not misread an empty event list as “no activity”. */
  const [redisDegraded, setRedisDegraded] = useState(false);
  const [sseMetrics, setSseMetrics] = useState<SseMetrics | null>(null);
  const [reconnectEvents, setReconnectEvents] = useState(0);

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
    setRedisDegraded(false);
    setSseMetrics(null);
    setReconnectEvents(0);
  }, [olympiadId]);

  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: number | undefined;
    let es: EventSource | null = null;
    let reconnectAttempts = 0;

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

    if (!monitorSseEnabled) {
      const pollMs = 12_000;
      const id = window.setInterval(() => void loadFirst(), pollMs);
      return () => {
        cancelled = true;
        window.clearInterval(id);
      };
    }

    const scheduleReconnect = () => {
      if (cancelled) return;
      reconnectAttempts += 1;
      setReconnectEvents((n) => n + 1);
      if (reconnectAttempts > SSE_MAX_ATTEMPTS) {
        setErr("Jonli ulanish uzildi. Sahifani yangilang yoki birozdan keyin qayta urinib ko‘ring.");
        return;
      }
      setErr((prev) => prev ?? "SSE uzildi — qayta ulanmoqda…");
      const backoff = Math.min(45_000, 1500 * 1.55 ** Math.min(reconnectAttempts, 9)) + Math.random() * 900;
      reconnectTimer = window.setTimeout(attachEs, backoff);
    };

    function attachEs() {
      if (cancelled) return;
      if (reconnectTimer !== undefined) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = undefined;
      }
      es?.close();
      es = new EventSource(`/api/olympiad/monitor/${olympiadId}/stream`, { withCredentials: true });

      es.onopen = () => {
        reconnectAttempts = 0;
        setErr(null);
      };

      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as {
            type?: string;
            participants?: Row[];
            serverNow?: string;
            pagination?: { nextCursor?: string | null };
            events?: MonitorEvent[];
            readModel?: Record<string, string> | null;
            degraded?: boolean;
            droppedEvents?: number;
            tickDurationMs?: number;
            avgTickDurationMs?: number;
            snapshotLatencyMs?: number;
            avgSnapshotLatencyMs?: number;
            redisUnavailable?: boolean;
            tick?: number;
          };
          if (msg.type === "heartbeat") {
            return;
          }
          if (msg.type === "metrics") {
            setSseMetrics({
              tickDurationMs: msg.tickDurationMs,
              avgTickDurationMs: msg.avgTickDurationMs,
              snapshotLatencyMs: msg.snapshotLatencyMs,
              avgSnapshotLatencyMs: msg.avgSnapshotLatencyMs,
              redisUnavailable: msg.redisUnavailable,
              droppedEvents: msg.droppedEvents,
              tick: msg.tick,
            });
            return;
          }
          if (msg.type === "events" && Array.isArray(msg.events)) {
            if (typeof msg.degraded === "boolean") setRedisDegraded(msg.degraded);
            setEventFeed((prev) => {
              const seen = new Set(prev.map(eventDedupeKey));
              const fresh: MonitorEvent[] = [];
              for (const e of msg.events as MonitorEvent[]) {
                const k = eventDedupeKey(e);
                if (!seen.has(k)) {
                  seen.add(k);
                  fresh.push(e);
                }
              }
              // WHY: Hard cap prevents unbounded memory if Redis replays a large backlog after reconnect.
              return [...fresh, ...prev].slice(0, 200);
            });
          }
          if (msg.type === "snapshot" && msg.participants) {
            if (typeof msg.degraded === "boolean") setRedisDegraded(msg.degraded);
            setRows(msg.participants);
            setUpdated(msg.serverNow ?? new Date().toISOString());
            setNextCursor(msg.pagination?.nextCursor ?? null);
            setErr(null);
          }
        } catch {
          /* ignore malformed */
        }
      };

      es.onerror = () => {
        es?.close();
        es = null;
        if (cancelled) return;
        scheduleReconnect();
      };
    }

    attachEs();

    return () => {
      cancelled = true;
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      es?.close();
    };
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
      <Card className="border-rose-300 bg-rose-50 p-4 text-sm text-rose-950 shadow-sm dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-50" role="alert">
        {err}
      </Card>
    );
  }
  if (!rows) {
    return (
      <p className="text-sm text-slate-600" role="status" aria-live="polite">
        Jonli ma’lumot yuklanmoqda…
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {redisDegraded ? (
        <div
          role="status"
          className="rounded-lg border border-amber-300/80 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950"
        >
          Redis vaqtincha ishlamayapti yoki sekin — voqealar ro‘yxati DB snapshot rejimiga tushishi mumkin. Jonli holat
          barqarorligi uchun infratuzilmani tekshiring.
        </div>
      ) : null}
      {updated ? (
        <p className="text-xs text-slate-500" aria-live="polite">
          Yangilandi: {new Date(updated).toLocaleString()}
          {monitorSseEnabled ? <span className="ml-2 text-emerald-700"> · SSE</span> : null}
          {sseMetrics?.avgTickDurationMs != null ? (
            <span className="ml-2 text-slate-400">
              · tick ~{sseMetrics.avgTickDurationMs}ms
              {sseMetrics.avgSnapshotLatencyMs ? ` · snap ~${sseMetrics.avgSnapshotLatencyMs}ms` : null}
            </span>
          ) : null}
          {reconnectEvents ? (
            <span className="ml-2 text-slate-400">· reconnects {reconnectEvents}</span>
          ) : null}
        </p>
      ) : null}
      {eventFeed.length ? (
        <Card className="border-slate-200 bg-slate-50/90 p-3 text-xs text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100">
          <p className="font-semibold text-slate-900">Redis voqealar (so‘nggi)</p>
          <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto font-mono text-[0.7rem] text-slate-700">
            {eventFeed.slice(0, 24).map((e) => (
              <li key={eventDedupeKey(e)}>
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
          <MonitorSessionRow key={r.sessionId} row={r} />
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

const MonitorSessionRow = memo(function MonitorSessionRow({ row: r }: { row: Row }) {
  return (
    <Card className="border-slate-200 bg-white p-3 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
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
  );
});

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
