import * as Sentry from "@sentry/nextjs";

/**
 * `try/catch` ichida xatolikni yutib qolgan server actionlar uchun —
 * Next `onRequestError` faqat chiqarilmagan throwlarni avtomatik tutadi.
 */
export function captureServerActionFailure(actionName: string, error: unknown, extra?: Record<string, unknown>) {
  Sentry.captureException(error, {
    tags: { server_action: actionName },
    fingerprint: ["server-action", actionName],
    extra: extra ?? {},
  });
}
