"use client";

import { useCallback, useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";
import { SESSION_IDLE_MS } from "@/lib/auth-session-idle";

const ACTIVITY_DEBOUNCE_MS = 15_000;
const SERVER_TOUCH_MIN_MS = 2 * 60 * 1000;

/**
 * Brauzerda 1 soat faoliyatsizlik — chiqish; server JWT ham `update()` orqali yangilanadi.
 */
export function SessionIdleGuard() {
  const { status, update } = useSession();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastServerTouchRef = useRef(0);
  const lastActivityPingRef = useRef(0);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current != null) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const logoutIdle = useCallback(() => {
    clearIdleTimer();
    void signOut({ callbackUrl: "/kirish?notice=idle-timeout" });
  }, [clearIdleTimer]);

  const scheduleIdleLogout = useCallback(() => {
    clearIdleTimer();
    idleTimerRef.current = setTimeout(logoutIdle, SESSION_IDLE_MS);
  }, [clearIdleTimer, logoutIdle]);

  const touchServerSession = useCallback(() => {
    const now = Date.now();
    if (now - lastServerTouchRef.current < SERVER_TOUCH_MIN_MS) return;
    lastServerTouchRef.current = now;
    void update();
  }, [update]);

  const onUserActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityPingRef.current < ACTIVITY_DEBOUNCE_MS) return;
    lastActivityPingRef.current = now;
    scheduleIdleLogout();
    touchServerSession();
  }, [scheduleIdleLogout, touchServerSession]);

  useEffect(() => {
    if (status !== "authenticated") {
      clearIdleTimer();
      return;
    }

    scheduleIdleLogout();
    touchServerSession();

    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"] as const;
    for (const ev of events) {
      window.addEventListener(ev, onUserActivity, { passive: true });
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        onUserActivity();
        void update().then((session) => {
          if (!session?.user) logoutIdle();
        });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearIdleTimer();
      for (const ev of events) {
        window.removeEventListener(ev, onUserActivity);
      }
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [status, scheduleIdleLogout, touchServerSession, onUserActivity, clearIdleTimer, update, logoutIdle]);

  return null;
}
