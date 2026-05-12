import { describe, expect, it } from "vitest";
import { medalKeyFromRank, medalLabelUz } from "@/lib/olympiad/certificate-medal";

describe("medalKeyFromRank", () => {
  it("assigns gold, silver, bronze bands", () => {
    expect(medalKeyFromRank(1)).toBe("gold");
    expect(medalKeyFromRank(2)).toBe("silver");
    expect(medalKeyFromRank(3)).toBe("silver");
    expect(medalKeyFromRank(10)).toBe("bronze");
    expect(medalKeyFromRank(11)).toBeNull();
    expect(medalKeyFromRank(null)).toBeNull();
  });
});

describe("medalLabelUz", () => {
  it("returns labels", () => {
    expect(medalLabelUz("gold")).toMatch(/Oltin/);
    expect(medalLabelUz(null)).toBe("—");
  });
});
