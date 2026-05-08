export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
    const { assertProductionConfig } = await import("@/lib/env");
    assertProductionConfig();
    const { registerShutdownHooks } = await import("@/lib/shutdown");
    registerShutdownHooks();
    const { isUpstashConfigured } = await import("@/lib/upstash-redis");
    const { logStructured } = await import("@/lib/logger");
    logStructured("info", "startup.node", { upstash: isUpstashConfigured() ? "on" : "off" });
  } else if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}
