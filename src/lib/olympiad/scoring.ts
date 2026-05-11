type Q = { id: string; optionsJson: string; correctIndex: number; points: number | null };

export function scoreOlympiadAttempt(
  order: string[],
  perms: Record<string, number[]>,
  displayAnswers: number[],
  questions: Q[],
): { score: number; maxScore: number; correct: number } {
  const byId = new Map(questions.map((q) => [q.id, q]));
  let earned = 0;
  let maxPoints = 0;
  let correct = 0;
  for (let i = 0; i < order.length; i++) {
    const qid = order[i]!;
    const q = byId.get(qid);
    if (!q) continue;
    const opts = JSON.parse(q.optionsJson) as string[];
    const perm = perms[qid] ?? opts.map((_, j) => j);
    const di = displayAnswers[i] ?? -1;
    const canonicalPick = di >= 0 && di < perm.length ? perm[di]! : -1;
    const ok = canonicalPick === q.correctIndex;
    const pts = q.points ?? 1;
    maxPoints += pts;
    if (ok) {
      earned += pts;
      correct += 1;
    }
  }
  const score = maxPoints > 0 ? Math.round((earned / maxPoints) * 100) : 0;
  return { score, maxScore: maxPoints, correct };
}
