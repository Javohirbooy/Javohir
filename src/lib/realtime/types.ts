/** Transport-agnostic realtime envelope — wire to SSE, WebSocket, or Redis stream bridge. */

export type RealtimeChannel = "contest:rank" | "contest:state" | "workspace:run" | "classroom:grades" | "learning:progress";

export type RealtimeMessage<T = unknown> = {
  channel: RealtimeChannel;
  event: string;
  payload: T;
  /** Server monotonic cursor for idempotent merge / replay. */
  seq?: bigint | number;
  ts: number;
};

export type ConnectionState = "idle" | "connecting" | "open" | "reconnecting" | "closed" | "error";

/** Narrow surface for DI — avoids circular imports with `event-bus.ts`. */
export type RealtimeBusPublishTarget = {
  publishQueued: (events: readonly unknown[]) => void;
};

export type RealtimeClientOptions = {
  /** Per-message callback (used when `onBatch` omitted). Runs after optional bus publish. */
  onMessage?: (msg: RealtimeMessage) => void;
  /** Single flush per batch window — preferred for high-frequency streams. */
  onBatch?: (msgs: RealtimeMessage[]) => void;
  onState?: (s: ConnectionState) => void;
  /** @deprecated Internal backoff is fixed in sse-subscription. */
  maxBackoffMs?: number;
  /** Inbound coalescing window (ms). Default 100. */
  batchWindowMs?: number;
  /** Publish normalized events to default process bus (when no `eventBus`). */
  publishToEventBus?: boolean;
  /** Scoped or custom bus — preferred over default singleton when provided. */
  eventBus?: RealtimeBusPublishTarget;
  /** Invoked on transport error before reconnect — e.g. mark data stale / safe UI. */
  onSafeMode?: () => void;
  /** After max reconnect attempts — stops reconnect loop; drive offline UI here. */
  onOfflineMode?: () => void;
};
