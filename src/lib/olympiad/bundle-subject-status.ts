import { isOlympiadExamTerminalStatus } from "@/lib/olympiad/exam-state-machine";
import type { BundleSubjectStatus } from "@/lib/olympiad/bundle-types";

type SessionSnap = {
  status: string;
  result: { score: number | null; maxScore: number | null } | null;
} | null;

/**
 * Fanlar ketma-ketligi: oldingi fan yakunlanmaguncha keyingisi LOCKED (ixtiyoriy tartib).
 * Hozircha faqat bundle tartibida oldingi COMPLETED bo‘lmasa LOCKED.
 */
export function resolveBundleSubjectStatus(
  session: SessionSnap,
  previousAllCompleted: boolean,
): BundleSubjectStatus {
  if (!previousAllCompleted) return "LOCKED";
  if (!session) return "NOT_STARTED";
  if (session.result && isOlympiadExamTerminalStatus(session.status)) return "COMPLETED";
  if (isOlympiadExamTerminalStatus(session.status)) return "COMPLETED";
  return "IN_PROGRESS";
}

export function subjectPercent(score: number | null, maxScore: number | null): number | null {
  if (score == null || maxScore == null || maxScore <= 0) return null;
  return Math.round((score / maxScore) * 1000) / 10;
}
