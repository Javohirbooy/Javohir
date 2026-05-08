import { headers } from "next/headers";

type LogLevel = "info" | "warn" | "error";

export type LogFields = Record<string, string | number | boolean | undefined>;

/**
 * Production: bir qator JSON (log aggregator uchun). Dev: o‘qilishi oson format.
 */
export function logStructured(level: LogLevel, event: string, fields?: LogFields) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...fields,
  };
  if (process.env.NODE_ENV === "production") {
    const line = JSON.stringify(payload);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  } else if (level === "error") {
    console.error(`[${event}]`, fields ?? {});
  } else if (level === "warn") {
    console.warn(`[${event}]`, fields ?? {});
  } else {
    console.info(`[${event}]`, fields ?? {});
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
