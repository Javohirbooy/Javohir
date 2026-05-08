/**
 * Transactional email (Resend).
 *
 * DNS (domaingizda, Resend dashboard bo‘yicha):
 * - SPF: TXT `@` yoki `send` — `v=spf1 include:resend.com ~all` (Resend ko‘rsatmasiga qarang).
 * - DKIM: Resend beradigan CNAME/TXT yozuvlarini qo‘shing (rotatsiya uchun ularning UI).
 * - DMARC: masalan `_dmarc` TXT `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain` → bosqichma-bosqich `quarantine`/`reject`.
 *
 * Navbat (BullMQ / Vercel Queue): `sendTransactionalEmail` ni keyinroq worker chaqirishi uchun
 * `EmailDispatchPayload` ni DB/queue ga yozing; hozircha sinxron HTTP + retry.
 */
export type EmailDispatchPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Idempotency uchun kelajakda ishlatish mumkin */
  idempotencyKey?: string;
};

export type SendEmailResult = { ok: true } | { ok: false; status: number; error: string };

const MAX_ATTEMPTS = 3;
const INITIAL_BACKOFF_MS = 400;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function shouldRetry(status: number) {
  return status === 429 || status === 408 || (status >= 500 && status <= 599);
}

/**
 * Resend orqali xabar yuboradi. 429/5xx uchun cheklangan retry.
 * Productionda `RESEND_API_KEY` bo‘lmasa, xabar yo‘qolishi mumkin — monitoringni yoqing.
 */
export async function sendTransactionalEmail(input: EmailDispatchPayload): Promise<SendEmailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "IQ Monitoring <onboarding@resend.dev>";

  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[mail:dev]", input.to, input.subject, input.text.slice(0, 500));
      return { ok: true };
    }
    console.error("[mail] RESEND_API_KEY yo‘q — productionda email yuborilmadi.", { to: input.to });
    return { ok: false, status: 0, error: "Email sozlanmagan." };
  }

  let lastStatus = 0;
  let lastBody = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html ?? `<pre>${escapeHtml(input.text)}</pre>`,
      }),
    });

    lastStatus = res.status;
    lastBody = await res.text().catch(() => "");

    if (res.ok) {
      return { ok: true };
    }

    if (!shouldRetry(lastStatus) || attempt === MAX_ATTEMPTS) {
      console.error("[mail] Resend error", lastStatus, lastBody.slice(0, 500));
      return { ok: false, status: lastStatus, error: lastBody || `HTTP ${lastStatus}` };
    }

    const backoff = INITIAL_BACKOFF_MS * 2 ** (attempt - 1);
    await sleep(backoff);
  }

  return { ok: false, status: lastStatus, error: lastBody || "unknown" };
}
