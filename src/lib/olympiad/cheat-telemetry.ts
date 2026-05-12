import * as Sentry from "@sentry/nextjs";
import { logStructured } from "@/lib/logger";

/** Maxfiy ma’lumot kiritilmasin — faqat tur va qisqa meta. */
export function olympiadCheatBreadcrumb(sessionId: string, type: string, detail?: Record<string, unknown>): void {
  Sentry.addBreadcrumb({
    category: "olympiad.anti_cheat",
    message: type,
    level: "info",
    data: {
      sessionIdPrefix: sessionId.slice(0, 8),
      type,
      ...sanitizeDetail(detail),
    },
  });
}

export function olympiadSecurityLog(event: string, fields: Record<string, unknown>): void {
  const safe: Record<string, string | number | boolean | undefined> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === undefined) safe[k] = v;
    else if (v == null) safe[k] = undefined;
    else safe[k] = JSON.stringify(v);
  }
  void logStructured("warn", event, safe);
}

function sanitizeDetail(detail?: Record<string, unknown>): Record<string, unknown> {
  if (!detail) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(detail)) {
    if (k.toLowerCase().includes("token") || k.toLowerCase().includes("secret")) continue;
    if (typeof v === "string" && v.length > 120) out[k] = `${v.slice(0, 120)}…`;
    else out[k] = v;
  }
  return out;
}
