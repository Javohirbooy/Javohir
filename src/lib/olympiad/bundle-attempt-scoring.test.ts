import { describe, expect, it } from "vitest";
import { computeBundleAttemptPoints } from "@/lib/olympiad/bundle-attempt-scoring";

describe("computeBundleAttemptPoints", () => {
  const subjects = [
    { olympiadId: "a", maxPoints: 30 },
    { olympiadId: "b", maxPoints: 30 },
  ];

  it("counts full bundle max while only one subject is done", () => {
    const p = computeBundleAttemptPoints(subjects, [
      {
        olympiadId: "a",
        status: "FINALIZED",
        result: { score: 100, maxScore: 30 },
      },
    ]);
    expect(p.earnedPoints).toBe(30);
    expect(p.maxPoints).toBe(60);
    expect(p.percent).toBe(50);
    expect(p.completedSubjects).toBe(1);
    expect(p.allDone).toBe(false);
  });

  it("combines two finalized subjects", () => {
    const p = computeBundleAttemptPoints(subjects, [
      { olympiadId: "a", status: "FINALIZED", result: { score: 90, maxScore: 30 } },
      { olympiadId: "b", status: "FINALIZED", result: { score: 100, maxScore: 30 } },
    ]);
    expect(p.earnedPoints).toBe(57);
    expect(p.maxPoints).toBe(60);
    expect(p.percent).toBe(95);
    expect(p.allDone).toBe(true);
  });
});
