import { describe, expect, it } from "vitest";
import { combineResultPoints, olympiadResultToPoints } from "@/lib/olympiad/result-points";

describe("olympiadResultToPoints", () => {
  it("treats score as percent when greater than maxScore", () => {
    const p = olympiadResultToPoints(90, 30);
    expect(p.earnedPoints).toBe(27);
    expect(p.maxPoints).toBe(30);
    expect(p.percent).toBe(90);
  });

  it("treats low percent scores correctly when below maxPoints", () => {
    const p = olympiadResultToPoints(27, 30);
    expect(p.percent).toBe(27);
    expect(p.earnedPoints).toBe(8.1);
  });

  it("does not confuse exact percent with perfect score (e.g. 30% on 30 pts)", () => {
    const p = olympiadResultToPoints(30, 30);
    expect(p.percent).toBe(30);
    expect(p.earnedPoints).toBe(9);
  });

  it("treats score above 100 as raw earned points", () => {
    const p = olympiadResultToPoints(105, 30);
    expect(p.earnedPoints).toBe(105);
    expect(p.percent).toBe(100);
  });

  it("combines two subjects into one 100% scale", () => {
    const a = olympiadResultToPoints(100, 30);
    const b = olympiadResultToPoints(90, 30);
    const c = combineResultPoints([a, b]);
    expect(c.earnedPoints).toBe(57);
    expect(c.maxPoints).toBe(60);
    expect(c.percent).toBe(95);
  });
});
