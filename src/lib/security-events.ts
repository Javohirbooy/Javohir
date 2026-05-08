import { logStructured } from "@/lib/logger";

export type SecurityEventType =
  | "auth.success"
  | "auth.failed"
  | "auth.locked"
  | "auth.blocked"
  | "auth.suspicious"
  | "redis_down"
  | "rate_limit_fallback"
  | "auth_lockout_triggered";

export function logSecurityEvent(event: SecurityEventType, fields?: Record<string, string | number | boolean | undefined>) {
  const level = event === "auth.success" ? "info" : "warn";
  logStructured(level, `security.${event}`, fields);
}
