import type { RealtimeMessage } from "./types";

export type RealtimeEventType = "leaderboard" | "contest" | "system" | "ui";

/** Normalized bus envelope — UI layers subscribe; transports publish only here. */
export type RealtimeEvent = {
  type: RealtimeEventType;
  payload: unknown;
  timestamp: number;
  source?: "sse" | "ws" | "internal";
};

export type RealtimeEventListener = (event: RealtimeEvent) => void;

export type RealtimeEventBus = {
  subscribe: (listener: RealtimeEventListener) => () => void;
  publish: (event: RealtimeEvent) => void;
  publishQueued: (events: readonly RealtimeEvent[]) => void;
};

export function createRealtimeEventBus(): RealtimeEventBus {
  const listeners = new Set<RealtimeEventListener>();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    publish(event) {
      for (const l of listeners) {
        l(event);
      }
    },
    publishQueued(events) {
      queueMicrotask(() => {
        for (const e of events) {
          for (const l of listeners) {
            l(e);
          }
        }
      });
    },
  };
}

/** Scoped bus — `destroy()` clears listeners and ignores further publishes (safe for route transitions). */
export type ScopedRealtimeEventBus = RealtimeEventBus & {
  destroy: () => void;
};

export function createRealtimeEventBusScope(): ScopedRealtimeEventBus {
  const listeners = new Set<RealtimeEventListener>();
  let destroyed = false;

  const safePublish = (event: RealtimeEvent) => {
    if (destroyed) return;
    for (const l of listeners) {
      l(event);
    }
  };

  return {
    subscribe(listener) {
      if (destroyed) return () => {};
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    publish(event) {
      safePublish(event);
    },
    publishQueued(events) {
      queueMicrotask(() => {
        if (destroyed) return;
        for (const e of events) {
          for (const l of listeners) {
            l(e);
          }
        }
      });
    },
    destroy() {
      destroyed = true;
      listeners.clear();
    },
  };
}

let defaultBus: RealtimeEventBus | null = null;

export function getDefaultRealtimeEventBus(): RealtimeEventBus {
  defaultBus ??= createRealtimeEventBus();
  return defaultBus;
}

/** Map transport message → bus type (pure). */
export function realtimeMessageToEvent(msg: RealtimeMessage, source: "sse" | "ws" = "sse"): RealtimeEvent {
  const timestamp = typeof msg.ts === "number" ? msg.ts : Date.now();
  if (msg.channel === "contest:rank") {
    return { type: "leaderboard", payload: msg, timestamp, source };
  }
  if (msg.channel === "contest:state") {
    return { type: "contest", payload: msg, timestamp, source };
  }
  if (msg.channel === "workspace:run") {
    return { type: "system", payload: msg, timestamp, source };
  }
  if (msg.channel === "classroom:grades" || msg.channel === "learning:progress") {
    return { type: "ui", payload: msg, timestamp, source };
  }
  return { type: "system", payload: msg, timestamp, source };
}
