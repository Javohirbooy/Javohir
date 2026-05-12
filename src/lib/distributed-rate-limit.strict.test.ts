import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getRedis = vi.fn();

vi.mock("@/lib/upstash-redis", () => ({
  getUpstashRedis: () => getRedis(),
  isUpstashConfigured: () => Boolean(getRedis()),
}));

vi.mock("@/lib/log-shipping", () => ({
  shipStructuredLog: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

describe("takeRateLimitSlot strict policy", () => {
  beforeEach(() => {
    vi.resetModules();
    getRedis.mockReset();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails closed when production strict, requireDistributed, no Redis", async () => {
    vi.stubEnv("NODE_ENV", "production");
    getRedis.mockReturnValue(null);
    const { takeRateLimitSlot } = await import("./distributed-rate-limit");
    const r = await takeRateLimitSlot("unit_ns", "id-1", 5, 60_000, { requireDistributed: true });
    expect(r.ok).toBe(false);
    expect(r.backend).toBe("redis_unavailable");
    expect(r.retryAfterMs).toBeGreaterThan(0);
  });

  it("uses memory in development without strict", async () => {
    vi.stubEnv("NODE_ENV", "development");
    getRedis.mockReturnValue(null);
    const { takeRateLimitSlot } = await import("./distributed-rate-limit");
    const r = await takeRateLimitSlot("unit_ns_dev", "id-2", 50, 60_000, { requireDistributed: false });
    expect(r.backend).toBe("memory");
  });

  it("bypasses strict when E2E relax flag set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("E2E_RELAX_DISTRIBUTED_RATE_LIMIT", "1");
    getRedis.mockReturnValue(null);
    const { takeRateLimitSlot } = await import("./distributed-rate-limit");
    const r = await takeRateLimitSlot("unit_ns_e2e", "id-3", 50, 60_000, { requireDistributed: true });
    expect(r.backend).toBe("memory");
  });
});
