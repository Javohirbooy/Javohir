type QuestionRow = { id: string; text: string; optionsJson: string; correctIndex: number; points: number | null };

export type OlympiadQuestionScoreRow = {
  questionId: string;
  text: string;
  maxPoints: number;
  earnedPoints: number;
  correct: boolean;
  answered: boolean;
};

/**
 * Score an olympiad attempt using per-question weights (`Question.points`, default 1).
 * `percentScore` is 0–100 (rounded) for legacy leaderboard / certificates.
 */
export function analyzeOlympiadAttemptAnswers(
  order: string[],
  perms: Record<string, number[]>,
  displayAnswers: number[],
  questions: QuestionRow[],
): {
  percentScore: number;
  earnedPoints: number;
  maxPoints: number;
  correctCount: number;
  answeredCount: number;
  rows: OlympiadQuestionScoreRow[];
} {
  const byId = new Map(questions.map((q) => [q.id, q]));
  let earned = 0;
  let maxPoints = 0;
  let correctCount = 0;
  let answeredCount = 0;
  const rows: OlympiadQuestionScoreRow[] = [];

  for (let i = 0; i < order.length; i++) {
    const qid = order[i]!;
    const q = byId.get(qid);
    if (!q) continue;
    const opts = JSON.parse(q.optionsJson) as string[];
    const perm = perms[qid] ?? opts.map((_, j) => j);
    const di = displayAnswers[i] ?? -1;
    const answered = di >= 0 && di < perm.length;
    if (answered) answeredCount += 1;
    const canonicalPick = answered ? perm[di]! : -1;
    const ok = canonicalPick === q.correctIndex;
    const rawPts = q.points;
    const pts = rawPts != null && rawPts > 0 ? rawPts : 1;
    maxPoints += pts;
    const earnedPts = ok ? pts : 0;
    if (ok) {
      earned += pts;
      correctCount += 1;
    }
    rows.push({
      questionId: q.id,
      text: q.text,
      maxPoints: pts,
      earnedPoints: earnedPts,
      correct: ok,
      answered,
    });
  }

  const percentScore = maxPoints > 0 ? Math.round((earned / maxPoints) * 100) : 0;
  return { percentScore, earnedPoints: earned, maxPoints, correctCount, answeredCount, rows };
}

/** @deprecated name — use {@link analyzeOlympiadAttemptAnswers} */
export function scoreOlympiadAttempt(
  order: string[],
  perms: Record<string, number[]>,
  displayAnswers: number[],
  questions: QuestionRow[],
): { score: number; maxScore: number; correct: number } {
  const a = analyzeOlympiadAttemptAnswers(order, perms, displayAnswers, questions);
  return { score: a.percentScore, maxScore: a.maxPoints, correct: a.correctCount };
}
