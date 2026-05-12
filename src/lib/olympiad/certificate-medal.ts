/** Reyting → medal (UI / PDF uchun kalit). */
export function medalKeyFromRank(rank: number | null | undefined): "gold" | "silver" | "bronze" | null {
  if (rank == null || rank < 1 || !Number.isFinite(rank)) return null;
  if (rank === 1) return "gold";
  if (rank <= 3) return "silver";
  if (rank <= 10) return "bronze";
  return null;
}

export function medalLabelUz(key: "gold" | "silver" | "bronze" | null): string {
  switch (key) {
    case "gold":
      return "Oltin medal";
    case "silver":
      return "Kumush medal";
    case "bronze":
      return "Bronza medal";
    default:
      return "—";
  }
}
