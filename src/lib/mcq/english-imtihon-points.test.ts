import { describe, expect, it } from "vitest";
import { ENGLISH_IMTIHON_MAX_POINTS, englishImtihonPointsForOrder } from "./english-imtihon-points";

describe("englishImtihonPointsForOrder", () => {
  it("assigns tiered weights", () => {
    expect(englishImtihonPointsForOrder(0)).toBe(1);
    expect(englishImtihonPointsForOrder(9)).toBe(1);
    expect(englishImtihonPointsForOrder(10)).toBe(1.5);
    expect(englishImtihonPointsForOrder(19)).toBe(1.5);
    expect(englishImtihonPointsForOrder(20)).toBe(2.5);
    expect(englishImtihonPointsForOrder(29)).toBe(2.5);
  });

  it("sums to 50 for 30 questions", () => {
    let sum = 0;
    for (let i = 0; i < 30; i++) sum += englishImtihonPointsForOrder(i);
    expect(sum).toBe(ENGLISH_IMTIHON_MAX_POINTS);
  });
});
