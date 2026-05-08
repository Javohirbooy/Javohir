import { logStructured } from "@/lib/logger";

/**
 * SIGTERM/SIGINT: Sentry flush + Prisma disconnect (graceful shutdown).
 */
export function registerShutdownHooks() {
  const g = globalThis as typeof globalThis & { __iqmShutdownHooks?: boolean };
  if (g.__iqmShutdownHooks) return;
  g.__iqmShutdownHooks = true;

  const onSignal = (signal: string) => {
    void (async () => {
      try {
        const Sentry = await import("@sentry/nextjs");
        await Sentry.flush(2000);
      } catch {
        /* noop */
      }
      try {
        const { prisma } = await import("@/lib/prisma");
        await prisma.$disconnect();
      } catch {
        /* noop */
      }
      logStructured("info", "shutdown.signal", { signal });
    })();
  };

  process.once("SIGTERM", () => onSignal("SIGTERM"));
  process.once("SIGINT", () => onSignal("SIGINT"));
}
