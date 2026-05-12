import type { RealtimeClientOptions } from "./types";
import { createSseSubscription } from "./sse-subscription";

export type RealtimeTransport = "sse" | "ws";

export function subscribeRealtime(
  transport: RealtimeTransport,
  endpoint: string,
  opts: RealtimeClientOptions,
): { close: () => void } {
  if (transport === "sse") {
    return createSseSubscription(endpoint, opts);
  }
  opts.onState?.("error");
  opts.onSafeMode?.();
  return {
    close: () => {
      opts.onState?.("closed");
    },
  };
}
