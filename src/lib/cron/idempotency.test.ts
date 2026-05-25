import { describe, expect, it } from "vitest";
import { resolveCronIdempotencyKey } from "@/lib/cron/idempotency";

describe("resolveCronIdempotencyKey", () => {
  it("uses explicit header when present", () => {
    const req = new Request("https://x/api/cron/tick", {
      headers: { "x-cron-idempotency-key": "gh-run-99" },
    });
    expect(resolveCronIdempotencyKey(req, "tick")).toBe("gh-run-99");
  });

  it("buckets vercel cron invocations", () => {
    const req = new Request("https://x/api/cron/tick", {
      headers: { "x-vercel-cron": "1" },
    });
    const key = resolveCronIdempotencyKey(req, "tick");
    expect(key.startsWith("tick:vercel:")).toBe(true);
  });
});
