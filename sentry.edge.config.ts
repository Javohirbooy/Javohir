import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
  sendDefaultPii: false,
  beforeSend(event) {
    if (event.request?.headers) {
      const h = { ...event.request.headers };
      delete h["Cookie"];
      delete h["Authorization"];
      event.request.headers = h;
    }
    if (event.request?.cookies) {
      delete event.request.cookies;
    }
    return event;
  },
});
