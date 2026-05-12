import { describe, expect, it } from "vitest";
import { scoreOlympiadAttempt } from "@/lib/olympiad/scoring";

describe("scoreOlympiadAttempt", () => {
  it("scores shuffled display picks against canonical answers", () => {
    const questions = [
      { id: "q1", optionsJson: JSON.stringify(["A", "B", "C", "D"]), correctIndex: 1, points: 1 },
    ];
    const order = ["q1"];
    const perms = { q1: [2, 0, 1, 3] };
    const displayAnswers = [2];
    const out = scoreOlympiadAttempt(order, perms, displayAnswers, questions);
    expect(out.correct).toBe(1);
    expect(out.maxScore).toBe(1);
    expect(out.score).toBe(100);
  });
});
