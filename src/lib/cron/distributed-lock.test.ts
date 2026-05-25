import { describe, expect, it } from "vitest";
import { advisoryLockPair } from "@/lib/cron/distributed-lock";

describe("advisoryLockPair", () => {
  it("is deterministic for the same key", () => {
    const a = advisoryLockPair("iq:cron:lock:olympiad_finalize");
    const b = advisoryLockPair("iq:cron:lock:olympiad_finalize");
    expect(a).toEqual(b);
  });

  it("differs for different keys", () => {
    const a = advisoryLockPair("job-a");
    const b = advisoryLockPair("job-b");
    expect(a).not.toEqual(b);
  });
});
