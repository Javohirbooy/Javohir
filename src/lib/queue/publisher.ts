import { logStructured } from "@/lib/logger";
import type { PublishResult, WorkerQueueMessage } from "@/lib/queue/types";

/**
 * Queue publisher — hozir no-op; `QSTASH_TOKEN` + `QSTASH_URL` bo‘lsa HTTP publish.
 * WHY: Vercel cron → enqueue → alohida consumer (keyingi bosqich).
 */
export async function publishWorkerMessage(msg: WorkerQueueMessage): Promise<PublishResult> {
  const token = process.env.QSTASH_TOKEN?.trim();
  const baseUrl = process.env.QSTASH_URL?.trim() ?? "https://qstash.upstash.io";
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.VERCEL_URL?.trim();

  if (!token || !site) {
    logStructured("info", "queue.publish.noop", { kind: msg.kind });
    return { ok: true, messageId: "noop" };
  }

  const destination =
    msg.kind === "finalize_session"
      ? `https://${site.replace(/^https?:\/\//, "")}/api/internal/worker/finalize-session`
      : `https://${site.replace(/^https?:\/\//, "")}/api/cron/tick`;

  try {
    const res = await fetch(`${baseUrl}/v2/publish/${encodeURIComponent(destination)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(msg),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `qstash_${res.status}:${text.slice(0, 120)}` };
    }
    const data = (await res.json()) as { messageId?: string };
    return { ok: true, messageId: data.messageId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
