import { memo } from "react";
import { cn } from "@/lib/utils";
import { eduTypography } from "@/lib/design-system/typography";
import { surfaceClass } from "@/lib/design-system/surfaces";
import type { ContestProblemDTO, LeaderboardRowDTO } from "@/lib/adapters";

export const ContestProblemRow = memo(function ContestProblemRow({ problem }: { problem: ContestProblemDTO }) {
  const state = problem.solved ? "solved" : problem.attempted ? "attempted" : "neutral";
  return (
    <div
      className={cn(
        "grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-slate-200 py-2.5 text-sm last:border-0 dark:border-slate-700",
        state === "solved" && "text-emerald-700 dark:text-emerald-300",
        state === "attempted" && "text-amber-800 dark:text-amber-200",
      )}
    >
      <span className="w-8 font-mono text-xs font-bold opacity-80">{problem.index}</span>
      <span className="min-w-0 truncate font-medium">{problem.title}</span>
      <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">{problem.points ?? "—"}</span>
    </div>
  );
});

export const ContestLeaderboardRow = memo(function ContestLeaderboardRow({ row }: { row: LeaderboardRowDTO }) {
  return (
    <tr className="border-t border-slate-100 dark:border-slate-800">
      <td className="px-3 py-2 font-mono tabular-nums">{row.rank}</td>
      <td className="px-3 py-2 font-medium">{row.handle}</td>
      <td className="px-3 py-2 text-right font-mono tabular-nums">{row.score}</td>
    </tr>
  );
});

export const ContestRankingTable = memo(function ContestRankingTable({ rows }: { rows: LeaderboardRowDTO[] }) {
  return (
    <div className={cn(surfaceClass("contest"), "overflow-hidden")}>
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/80">
        <h2 className={cn(eduTypography.h5, "text-slate-900 dark:text-slate-50")}>Jonli reyting (namuna)</h2>
      </div>
      <div className="max-h-72 overflow-auto">
        <table className="w-full min-w-[320px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white/95 text-xs uppercase text-slate-500 backdrop-blur dark:bg-slate-950/95 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2 font-semibold">#</th>
              <th className="px-3 py-2 font-semibold">Ishtirokchi</th>
              <th className="px-3 py-2 text-right font-semibold">Ball</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <ContestLeaderboardRow key={r.userId} row={r} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
