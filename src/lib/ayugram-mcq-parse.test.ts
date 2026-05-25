import { describe, expect, it } from "vitest";
import {
  parseCompactLetterAnswerKey,
  parseNumberedUzMcqDocument,
} from "@/lib/ayugram-mcq-parse";

describe("parseNumberedUzMcqDocument", () => {
  it("strips question numbers and pairs with compact answer key", () => {
    const doc = `Test

1. Birinchi savol matni?

A) 1 B) 2 C) 3 D) 4

2. Ikkinchi savol?

A) a B) b C) c D) d
`;
    const answers = `javoblar\n\n1\nB\n2\nC\n`;
    const qs = parseNumberedUzMcqDocument(doc);
    expect(qs).toHaveLength(2);
    expect(qs[0]!.text).toBe("Birinchi savol matni?");
    expect(qs[0]!.text).not.toMatch(/^\d+\./);
    expect(parseCompactLetterAnswerKey(answers)).toEqual(["B", "C"]);
  });
});
