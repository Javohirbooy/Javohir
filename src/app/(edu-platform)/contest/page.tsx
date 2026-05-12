import { ContestProblemRow, ContestRankingTable } from "@/components/contest/contest-problem-row";
import { StressSimulatorPanel } from "@/components/shared/stress-simulator-panel";
import { normalizeLeaderboard } from "@/lib/adapters";
import { getCachedContestSnapshot, getCachedLeaderboard } from "@/lib/cache";
import { cn } from "@/lib/utils";
import { eduTypography } from "@/lib/design-system/typography";

const demoProblems = getCachedContestSnapshot("demo", () => [
  { id: "p1", index: "A", title: "Ikki nuqta orasidagi masofa", points: 500, solved: true, attempted: true },
  { id: "p2", index: "B", title: "Massiv prefiksi", points: 750, solved: false, attempted: true },
  { id: "p3", index: "C", title: "Graf diametri", points: 1000, solved: false, attempted: false },
]);

const demoRows = getCachedLeaderboard("demo", () =>
  normalizeLeaderboard([
    { rank: 1, userId: "u1", handle: "alpha", score: 1750, penaltyMs: 120_000 },
    { rank: 2, userId: "u2", handle: "beta", score: 1500, penaltyMs: 95_000 },
    { rank: 3, userId: "u3", handle: "gamma", score: 1500, penaltyMs: 102_000 },
    { rank: 4, userId: "u4", handle: "delta", score: 500, penaltyMs: 40_000 },
  ]),
);

export default function ContestModePage() {
  return (
    <div className="space-y-6 py-6">
      <p className={cn(eduTypography.body, "text-slate-600 dark:text-slate-300")}>
        Contest mode: zich jadval, monospace metrikalar, keyboard-first navigatsiya uchun semantik tartib. Reyting yangilanishi{" "}
        <code className="rounded bg-slate-200 px-1 py-0.5 text-xs dark:bg-slate-800">subscribeRealtime(&quot;sse&quot;, …)</code>{" "}
        orqali ulanadi.
      </p>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <ContestRankingTable rows={demoRows} />
          <div className="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
            <h2 className={cn(eduTypography.h5, "text-slate-900 dark:text-slate-50")}>Muammolar</h2>
            <div className="mt-2">
              {demoProblems.map((p) => (
                <ContestProblemRow key={p.id} problem={p} />
              ))}
            </div>
          </div>
        </div>
        <StressSimulatorPanel />
      </div>
    </div>
  );
}
