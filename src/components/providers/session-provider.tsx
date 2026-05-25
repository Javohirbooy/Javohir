"use client";

import { SessionProvider } from "next-auth/react";
import { SessionIdleGuard } from "@/components/auth/session-idle-guard";

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={60} refetchOnWindowFocus>
      <SessionIdleGuard />
      {children}
    </SessionProvider>
  );
}
