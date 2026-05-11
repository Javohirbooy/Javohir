import { describe, expect, it } from "vitest";
import { isLeaseHeldByOtherWorker, parseOlympiadDisplayAnswers } from "@/lib/olympiad/finalize-logic";
import { OLYMPIAD_FINALIZE_LEASE_MS } from "@/lib/olympiad/finalization-constants";

describe("parseOlympiadDisplayAnswers", () => {
  it("pads unanswered with -1", () => {
    expect(parseOlympiadDisplayAnswers(null, 3)).toEqual([-1, -1, -1]);
    expect(parseOlympiadDisplayAnswers("[0,1]", 4)).toEqual([0, 1, -1, -1]);
  });

  it("truncates to length", () => {
    expect(parseOlympiadDisplayAnswers("[0,1,2,3]", 2)).toEqual([0, 1]);
  });

  it("handles invalid json", () => {
    expect(parseOlympiadDisplayAnswers("not-json", 2)).toEqual([-1, -1]);
  });
});

describe("isLeaseHeldByOtherWorker", () => {
  const runId = "worker-a";
  const now = new Date("2026-05-11T12:00:00.000Z");

  it("returns false when no lock", () => {
    expect(
      isLeaseHeldByOtherWorker({
        processingLock: null,
        processingStartedAt: null,
        runId,
        now,
        leaseMs: OLYMPIAD_FINALIZE_LEASE_MS,
      }),
    ).toBe(false);
  });

  it("returns false when same run holds lock", () => {
    expect(
      isLeaseHeldByOtherWorker({
        processingLock: runId,
        processingStartedAt: new Date(now.getTime() - 60_000),
        runId,
        now,
        leaseMs: OLYMPIAD_FINALIZE_LEASE_MS,
      }),
    ).toBe(false);
  });

  it("returns true when another run holds fresh lease", () => {
    expect(
      isLeaseHeldByOtherWorker({
        processingLock: "worker-b",
        processingStartedAt: new Date(now.getTime() - 60_000),
        runId,
        now,
        leaseMs: OLYMPIAD_FINALIZE_LEASE_MS,
      }),
    ).toBe(true);
  });

  it("returns false when other lease is stale", () => {
    expect(
      isLeaseHeldByOtherWorker({
        processingLock: "worker-b",
        processingStartedAt: new Date(now.getTime() - OLYMPIAD_FINALIZE_LEASE_MS - 60_000),
        runId,
        now,
        leaseMs: OLYMPIAD_FINALIZE_LEASE_MS,
      }),
    ).toBe(false);
  });
});
