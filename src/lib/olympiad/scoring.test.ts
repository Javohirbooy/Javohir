import { describe, expect, it } from "vitest";
import { analyzeOlympiadAttemptAnswers, scoreOlympiadAttempt } from "@/lib/olympiad/scoring";

describe("scoreOlympiadAttempt", () => {
  it("scores shuffled display picks against canonical answers", () => {
    const questions = [
      { id: "q1", text: "t1", optionsJson: JSON.stringify(["A", "B", "C", "D"]), correctIndex: 1, points: 1 },
    ];
    const order = ["q1"];
    const perms = { q1: [2, 0, 1, 3] };
    const displayAnswers = [2];
    const out = scoreOlympiadAttempt(order, perms, displayAnswers, questions);
    expect(out.correct).toBe(1);
    expect(out.maxScore).toBe(1);
    expect(out.score).toBe(100);
  });

  it("applies per-question weights", () => {
    const questions = [
      { id: "q1", text: "t1", optionsJson: JSON.stringify(["A", "B"]), correctIndex: 0, points: 5 },
      { id: "q2", text: "t2", optionsJson: JSON.stringify(["A", "B"]), correctIndex: 1, points: 5 },
    ];
    const order = ["q1", "q2"];
    const perms = { q1: [0, 1], q2: [0, 1] };
    const displayAnswers = [0, 1];
    const out = scoreOlympiadAttempt(order, perms, displayAnswers, questions);
    expect(out.correct).toBe(2);
    expect(out.maxScore).toBe(10);
    expect(out.score).toBe(100);
  });

  it("defaults null or non-positive weights to 1", () => {
    const questions = [{ id: "q1", text: "t1", optionsJson: JSON.stringify(["A", "B"]), correctIndex: 0, points: 0 }];
    const out = scoreOlympiadAttempt(["q1"], { q1: [0, 1] }, [0], questions);
    expect(out.maxScore).toBe(1);
  });

  it("counts orphan order slots as wrong with default weight 1", () => {
    const questions = [
      { id: "q1", text: "t1", optionsJson: JSON.stringify(["A", "B"]), correctIndex: 0, points: 2 },
    ];
    const order = ["ghost", "q1"];
    const perms = { q1: [0, 1] };
    const displayAnswers = [0, 0];
    const a = analyzeOlympiadAttemptAnswers(order, perms, displayAnswers, questions);
    expect(a.maxPoints).toBe(3);
    expect(a.correctCount).toBe(1);
    expect(a.earnedPoints).toBe(2);
    expect(a.rows[0]?.questionId).toBe("ghost");
    expect(a.rows[0]?.correct).toBe(false);
    expect(a.rows[0]?.userCanonicalIndex).toBe(-1);
  });
});
