import { describe, expect, it } from "vitest";
import {
  bundleGradeSectionKey,
  canonicalBundleGradeSectionHeading,
  extractGradeNumberFromLabel,
} from "@/lib/olympiad/bundle-grade-section";

describe("extractGradeNumberFromLabel", () => {
  it.each([
    ["8", 8],
    ["8-A", 8],
    ["8-a", 8],
    ["8A", 8],
    ["8 a", 8],
    ["8-sinf", 8],
    ["8 SINF", 8],
    ["8 B sinf", 8],
    ["8b", 8],
    ["8-D", 8],
    ["9-sinf", 9],
    ["11", 11],
  ])("%s → %s", (label, n) => {
    expect(extractGradeNumberFromLabel(label)).toBe(n);
  });
});

describe("bundleGradeSectionKey", () => {
  it("merges all 8th-grade label variants into one key", () => {
    const labels = ["8", "8-A", "8-a", "8-B", "8b", "8-sinf", "8 B sinf", "8-D"];
    const keys = new Set(labels.map((l) => bundleGradeSectionKey(l)));
    expect(keys).toEqual(new Set(["g:8"]));
  });

  it("keeps different numeric grades separate", () => {
    expect(bundleGradeSectionKey("7")).toBe("g:7");
    expect(bundleGradeSectionKey("8-A")).toBe("g:8");
    expect(bundleGradeSectionKey("9-sinf")).toBe("g:9");
    expect(bundleGradeSectionKey("7")).not.toBe(bundleGradeSectionKey("8"));
  });

  it("heading is unified per grade number", () => {
    expect(canonicalBundleGradeSectionHeading(bundleGradeSectionKey("8-A"))).toBe("8-sinf");
    expect(canonicalBundleGradeSectionHeading(bundleGradeSectionKey("8-sinf"))).toBe("8-sinf");
  });
});
