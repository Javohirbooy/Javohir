/**
 * Data adapters — keep UI free of wire format. Swap REST → gRPC without touching components.
 */

export type LeaderboardRowDTO = {
  rank: number;
  userId: string;
  handle: string;
  score: number;
  penaltyMs?: number;
  lastSubmitAt?: string;
};

export type ContestProblemDTO = {
  id: string;
  index: string;
  title: string;
  points?: number;
  solved?: boolean;
  attempted?: boolean;
};

export function normalizeLeaderboard(rows: LeaderboardRowDTO[]): LeaderboardRowDTO[] {
  const sorted = [...rows].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.penaltyMs ?? 0) - (b.penaltyMs ?? 0);
  });
  return sorted.map((r, i) => ({ ...r, rank: i + 1 }));
}
