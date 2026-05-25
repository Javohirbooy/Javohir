import { describe, expect, it } from "vitest";
import {
  buildQuestionAnswerExportRows,
  summarizeQuestionRows,
} from "@/lib/olympiad/export-question-details";

const questions = [
  {
    id: "q1",
    text: "2+2?",
    optionsJson: JSON.stringify(["3", "4", "5", "6"]),
    correctIndex: 1,
    points: 1,
  },
  {
    id: "q2",
    text: "3+3?",
    optionsJson: JSON.stringify(["5", "6", "7", "8"]),
    correctIndex: 1,
    points: 1,
  },
];

describe("buildQuestionAnswerExportRows", () => {
  it("marks correct, wrong, and unanswered", () => {
    const rows = buildQuestionAnswerExportRows({
      answersJson: JSON.stringify([1, 0]),
      attemptAnswersJson: null,
      questionOrderJson: JSON.stringify(["q1", "q2"]),
      optionPermutationsJson: "{}",
      questions,
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]?.verdict).toBe("To'g'ri");
    expect(rows[0]?.selectedLetter).toBe("B");
    expect(rows[1]?.verdict).toBe("Xato");
    expect(rows[1]?.selectedLetter).toBe("A");
    expect(rows[1]?.correctLetter).toBe("B");
  });

  it("summarizes correct and wrong numbers", () => {
    const rows = buildQuestionAnswerExportRows({
      answersJson: JSON.stringify([1, -1]),
      attemptAnswersJson: null,
      questionOrderJson: JSON.stringify(["q1", "q2"]),
      optionPermutationsJson: "{}",
      questions,
    });
    const s = summarizeQuestionRows(rows);
    expect(s.correctQuestionNumbers).toBe("1");
    expect(s.wrongQuestionNumbers).toBe("");
    expect(s.wrongDetails).toBe("");
  });
});
