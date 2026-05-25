/** DB: `score` ko‘pincha foiz (0–100), `maxScore` — savollar yig‘indisi (ball). */
export type OlympiadResultPoints = {
  earnedPoints: number;
  maxPoints: number;
  percent: number;
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Olimpiada natijasini ball / foiz ko‘rinishiga keltiradi (paket va natijalar UI).
 *
 * `OlympiadResult.score` doim 0–100 foiz; `maxScore` — savollar yig‘indisi (ball).
 * Eski heuristika past foizlarni (masalan 27% / 30 ball) noto‘g‘ri 27 ball deb o‘qigan.
 */
export function olympiadResultToPoints(score: number | null, maxScore: number | null): OlympiadResultPoints {
  const rawScore = score ?? 0;
  const maxPoints = maxScore ?? 0;
  if (maxPoints <= 0) {
    return { earnedPoints: 0, maxPoints: 0, percent: 0 };
  }

  if (rawScore <= 100) {
    const percent = Math.min(100, round1(rawScore));
    const earnedPoints = round1((percent / 100) * maxPoints);
    return { earnedPoints, maxPoints, percent };
  }

  const earnedPoints = round1(rawScore);
  const percent = Math.min(100, round1((earnedPoints / maxPoints) * 100));
  return { earnedPoints, maxPoints, percent };
}

export function combineResultPoints(parts: OlympiadResultPoints[]): OlympiadResultPoints {
  const earnedPoints = round1(parts.reduce((s, p) => s + p.earnedPoints, 0));
  const maxPoints = round1(parts.reduce((s, p) => s + p.maxPoints, 0));
  const percent = maxPoints > 0 ? Math.min(100, round1((earnedPoints / maxPoints) * 100)) : 0;
  return { earnedPoints, maxPoints, percent };
}
