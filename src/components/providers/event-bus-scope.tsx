"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  createRealtimeEventBusScope,
  type ScopedRealtimeEventBus,
} from "@/lib/realtime/event-bus";

const ScopedEventBusContext = createContext<ScopedRealtimeEventBus | null>(null);

/**
 * One scoped event bus per layout subtree — `destroy()` on unmount clears listeners (edge navigations).
 */
export function EventBusScopeProvider({ children }: { children: ReactNode }) {
  const [scope] = useState(() => createRealtimeEventBusScope());

  useEffect(() => {
    return () => {
      scope.destroy();
    };
  }, [scope]);

  return <ScopedEventBusContext.Provider value={scope}>{children}</ScopedEventBusContext.Provider>;
}

export function useScopedEventBus(): ScopedRealtimeEventBus | null {
  return useContext(ScopedEventBusContext);
}
