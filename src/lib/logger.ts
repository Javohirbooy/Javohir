import { headers } from "next/headers";

type LogLevel = "info" | "warn" | "error";

export type LogFields = Record<string, string | number | boolean | undefined>;

const SENSITIVE_KEY = /password|secret|token|authorization|cookie|apikey|api_key|private|credential|bearer|database_url|connection_string|dsn|blob_read|redis.*token/i;

/** Log aggregator ga yuborilganda maxfiy kalitlarni yashirish. */
export function sanitizeLogFields(fields?: LogFields): LogFields | undefined {
  if (!fields) return undefined;
  const out: LogFields = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    if (SENSITIVE_KEY.test(k)) {
      out[k] = "[redacted]";
      continue;
    }
    if (typeof v === "string" && v.length > 800) {
      out[k] = `${v.slice(0, 240)}…[truncated]`;
      continue;
    }
    out[k] = v;
  }
  return out;
}

/**
 * Production: bir qator JSON (log aggregator uchun). Dev: o‘qilishi oson format.
 * `fields` kalitlari avtomatik maskalanadi — baribir maxfiy qiymat yozmang.
 */
export function logStructured(level: LogLevel, event: string, fields?: LogFields) {
  const safe = sanitizeLogFields(fields);
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...safe,
  };
  if (process.env.NODE_ENV === "production") {
    const line = JSON.stringify(payload);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  } else if (level === "error") {
    console.error(`[${event}]`, safe ?? {});
  } else if (level === "warn") {
    console.warn(`[${event}]`, safe ?? {});
  } else {
    console.info(`[${event}]`, safe ?? {});
  }
}

/** So‘rov kontekstida `x-request-id` ni qo‘shadi (RSC / server action). */
export async function logStructuredFromRequest(level: LogLevel, event: string, fields?: LogFields) {
  try {
    const h = await headers();
    const requestId = h.get("x-request-id") ?? undefined;
    logStructured(level, event, { ...fields, requestId });
  } catch {
    logStructured(level, event, fields);
  }
}
