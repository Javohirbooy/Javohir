import { describe, expect, it } from "vitest";
import {
  analyzeResultToExportRow,
  buildDetailedResultsWorkbook,
  type DetailedStudentExportRow,
} from "./detailed-results-excel";

describe("analyzeResultToExportRow", () => {
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

  it("marks wrong answers and lists question numbers", () => {
    const row = analyzeResultToExportRow({
      answersJson: JSON.stringify([0, 1]),
      attemptAnswersJson: null,
      questionOrderJson: JSON.stringify(["q1", "q2"]),
      optionPermutationsJson: JSON.stringify({ q1: [0, 1, 2, 3], q2: [0, 1, 2, 3] }),
      questions,
      participant: {
        firstName: "Ali",
        lastName: "Valiyev",
        gradeLabel: "7-sinf",
        schoolName: "Maktab 1",
      },
      olympiadTitle: "Matematika 7",
      score: 50,
      maxScore: 100,
    });
    expect(row).not.toBeNull();
    expect(row!.correctCount).toBe(1);
    expect(row!.wrongQuestionNumbers).toBe("1");
    expect(row!.correctQuestionNumbers).toBe("2");
    expect(row!.questionDetails).toHaveLength(2);
  });
});

describe("buildDetailedResultsWorkbook", () => {
  it("produces xlsx buffer with multiple grade sheets", () => {
    const rows: DetailedStudentExportRow[] = [
      {
        gradeLabel: "7-sinf",
        gradeSectionKey: "g:7|",
        firstName: "A",
        lastName: "B",
        schoolName: "M1",
        olympiadTitle: "Test",
        earnedPoints: 10,
        maxPoints: 30,
        percent: 33.3,
        correctCount: 10,
        wrongCount: 20,
        unansweredCount: 0,
        correctQuestionNumbers: "3",
        wrongQuestionNumbers: "1, 2",
        wrongDetails: "1(A→B)",
        questionDetails: [],
      },
      {
        gradeLabel: "8-A",
        gradeSectionKey: "g:8",
        firstName: "C",
        lastName: "D",
        schoolName: "M2",
        olympiadTitle: "Test 8",
        earnedPoints: 25,
        maxPoints: 30,
        percent: 83.3,
        correctCount: 25,
        wrongCount: 5,
        unansweredCount: 0,
        correctQuestionNumbers: "1, 2",
        wrongQuestionNumbers: "5",
        wrongDetails: "5(C→D)",
        questionDetails: [],
      },
    ];
    const buf = buildDetailedResultsWorkbook(rows, []);
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf[0]).toBe(0x50); // PK zip / xlsx
  });
});
