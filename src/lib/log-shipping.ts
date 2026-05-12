import { logStructured } from "@/lib/logger";

export type StructuredLogPayload = Record<string, string | number | boolean | null | undefined>;

/**
 * Kelajakda log aggregator (Datadog, OpenTelemetry collector, va hokazo) uchun hook.
 * Hozircha: no-op yoki ixtiyoriy `LOG_SHIP_WEBHOOK_URL` ga POST (max 8KB).
 */
export async function shipStructuredLog(event: string, payload: StructuredLogPayload): Promise<void> {
  const url = process.env.LOG_SHIP_WEBHOOK_URL?.trim();
  if (!url) return;
  try {
    const body = JSON.stringify({ event, ts: new Date().toISOString(), ...payload }).slice(0, 8000);
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(2500),
    });
  } catch (e) {
    logStructured("warn", "log_ship.webhook_failed", {
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
