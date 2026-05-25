import { describe, expect, it } from "vitest";
import { computeDynamicBatch } from "@/lib/cron/dynamic-batch";

describe("computeDynamicBatch", () => {
  it("reduces batch on high errors", () => {
    const r = computeDynamicBatch({
      baseBatch: 80,
      maxRounds: 20,
      budgetMs: 95_000,
      metrics: { at: "", durationMs: 40_000, errors: 5 },
    });
    expect(r.batchLimit).toBeLessThan(80);
    expect(r.reason).toContain("high_errors");
  });

  it("increases batch slightly when fast and clean", () => {
    const r = computeDynamicBatch({
      baseBatch: 40,
      maxRounds: 15,
      budgetMs: 95_000,
      metrics: { at: "", durationMs: 20_000, errors: 0 },
    });
    expect(r.batchLimit).toBeGreaterThanOrEqual(40);
  });
});
