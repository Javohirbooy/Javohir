import { describe, expect, it } from "vitest";
import {
  computeAssignedOlympiadIds,
  groupBundleOlympiadSlots,
  parseTestPackMeta,
  pickLeastLoadedOlympiadId,
  tallyVariantAssignments,
} from "./bundle-variant-assign";

describe("parseTestPackMeta", () => {
  it("reads pack key and variant from may17 metadata", () => {
    const meta = JSON.stringify({
      may17Math8Sinf: true,
      gradeNumber: 8,
      variant: 2,
    });
    expect(parseTestPackMeta(meta)).toEqual({ packKey: "may17Math8Sinf", variant: 2 });
  });
});

describe("variant assignment", () => {
  const v1 = { olympiadId: "o1", importMetadataJson: '{"may17Math8Sinf":true,"variant":1}' };
  const v2 = { olympiadId: "o2", importMetadataJson: '{"may17Math8Sinf":true,"variant":2}' };
  const english = { olympiadId: "o3", importMetadataJson: '{"may17English7":true,"variant":1}' };

  it("groups two math variants under one pack key", () => {
    const groups = groupBundleOlympiadSlots([v1, v2]);
    expect(groups.size).toBe(1);
    expect(groups.get("may17Math8Sinf")).toHaveLength(2);
  });

  it("alternates variants for new participants", () => {
    const first = computeAssignedOlympiadIds([v1, v2, english], []);
    expect(first).toContain("o1");
    expect(first).toContain("o3");
    expect(first.filter((id) => id === "o1" || id === "o2")).toHaveLength(1);

    const second = computeAssignedOlympiadIds(
      [v1, v2, english],
      [JSON.stringify(first)],
    );
    const mathSecond = second.find((id) => id === "o1" || id === "o2");
    expect(mathSecond).not.toBe(first.find((id) => id === "o1" || id === "o2"));
  });

  it("pickLeastLoadedOlympiadId prefers lower count", () => {
    const slots = groupBundleOlympiadSlots([v1, v2]).get("may17Math8Sinf")!;
    const tally = tallyVariantAssignments(
      [JSON.stringify(["o1", "o3"]), JSON.stringify(["o1"])],
      ["o1", "o2"],
    );
    expect(pickLeastLoadedOlympiadId(slots, tally)).toBe("o2");
  });
});
