import type { ConnectionState, RealtimeBusPublishTarget, RealtimeMessage, RealtimeClientOptions } from "./types";
import { realtimeMessageToEvent } from "./event-bus";

const defaultBatchWindowMs = 100;

const SSE_BASE_BACKOFF_MS = 1000;
const SSE_MAX_BACKOFF_MS = 15_000;
const SSE_BACKOFF_MULTIPLIER = 1.8;
const SSE_MAX_RECONNECT_ATTEMPTS = 10;

function nextBackoffMs(attemptIndex: number): number {
  let ms = SSE_BASE_BACKOFF_MS;
  for (let i = 0; i < attemptIndex; i++) {
    ms = Math.min(SSE_MAX_BACKOFF_MS, ms * SSE_BACKOFF_MULTIPLIER);
  }
  return Math.round(ms);
}

/** Reduces synchronized reconnect storms after outages. */
function jitterBackoffMs(ms: number): number {
  return Math.round(ms * (0.85 + Math.random() * 0.3));
}

function resolvePublishBus(opts: RealtimeClientOptions): RealtimeBusPublishTarget | null {
  if (opts.eventBus) return opts.eventBus;
  return null;
}

/** Last wins per channel+event within one flush window — drops duplicate spam. */
function dedupeRealtimeBatch(batch: RealtimeMessage[]): RealtimeMessage[] {
  const map = new Map<string, RealtimeMessage>();
  for (const m of batch) {
    map.set(`${m.channel}:${m.event}`, m);
  }
  return [...map.values()];
}

/**
 * Browser SSE client with exponential backoff reconnect, reconnect caps, and inbound batching.
 */
export function createSseSubscription(url: string, opts: RealtimeClientOptions): { close: () => void } {
  const hasConsumer = Boolean(opts.onMessage ?? opts.onBatch ?? opts.eventBus);
  if (!hasConsumer) {
    throw new Error("createSseSubscription: provide onMessage, onBatch, and/or eventBus");
  }

  const batchWindowMs = opts.batchWindowMs ?? defaultBatchWindowMs;

  let es: EventSource | null = null;
  let closed = false;
  let reconnectAttemptIndex = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let offlineEmitted = false;
  const queue: RealtimeMessage[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const setState = (s: ConnectionState) => opts.onState?.(s);

  const flush = () => {
    flushTimer = null;
    if (!queue.length) return;
    const raw = queue.splice(0, queue.length);
    const batch = dedupeRealtimeBatch(raw);

    const bus = resolvePublishBus(opts);
    if (bus) {
      const events = batch.map((m) => realtimeMessageToEvent(m, "sse"));
      bus.publishQueued(events);
    }

    if (opts.onBatch) {
      opts.onBatch(batch);
    } else if (opts.onMessage) {
      for (const m of batch) {
        opts.onMessage(m);
      }
    }
  };

  const scheduleFlush = () => {
    if (flushTimer != null) return;
    flushTimer = setTimeout(flush, batchWindowMs);
  };

  const enqueue = (msg: RealtimeMessage) => {
    queue.push(msg);
    scheduleFlush();
  };

  const scheduleReconnect = () => {
    if (closed) return;
    if (reconnectAttemptIndex >= SSE_MAX_RECONNECT_ATTEMPTS) {
      if (!offlineEmitted) {
        offlineEmitted = true;
        setState("closed");
        opts.onOfflineMode?.();
      }
      return;
    }
    const delay = jitterBackoffMs(nextBackoffMs(reconnectAttemptIndex));
    reconnectAttemptIndex += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  };

  const connect = () => {
    if (closed || typeof EventSource === "undefined") return;
    const isFirst = reconnectAttemptIndex === 0;
    setState(isFirst ? "connecting" : "reconnecting");
    es = new EventSource(url, { withCredentials: true });

    es.onopen = () => {
      reconnectAttemptIndex = 0;
      offlineEmitted = false;
      setState("open");
    };

    es.onmessage = (ev) => {
      try {
        const raw = JSON.parse(ev.data as string) as unknown;
        if (raw && typeof raw === "object" && "channel" in raw && "event" in raw) {
          enqueue(raw as RealtimeMessage);
        }
      } catch {
        /* ignore malformed */
      }
    };

    es.onerror = () => {
      setState("error");
      opts.onSafeMode?.();
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      flush();
      es?.close();
      es = null;
      if (!closed) {
        scheduleReconnect();
      }
    };
  };

  connect();

  return {
    close: () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      flush();
      es?.close();
      setState("closed");
    },
  };
}
