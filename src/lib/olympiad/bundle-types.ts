/** Fan kartasi holati (paket dashboard). */
export type BundleSubjectStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "LOCKED";

export type BundleSubjectCard = {
  olympiadId: string;
  orderIndex: number;
  title: string;
  subjectEmoji: string | null;
  durationMinutes: number;
  questionCount: number;
  totalPoints: number;
  status: BundleSubjectStatus;
  sessionId: string | null;
  score: number | null;
  maxScore: number | null;
  percent: number | null;
};

export type BundleDashboardPayload = {
  bundleId: string;
  title: string;
  description: string | null;
  studentName: string;
  schoolName: string;
  gradeLabel: string;
  region: string;
  startsAt: string;
  endsAt: string | null;
  completedCount: number;
  totalSubjects: number;
  completionPercent: number;
  allCompleted: boolean;
  subjects: BundleSubjectCard[];
  totalScore: number | null;
  totalMaxScore: number | null;
};

export type BundleCombinedResult = {
  bundleTitle: string;
  studentName: string;
  schoolName: string;
  gradeLabel: string;
  totalScore: number;
  totalMaxScore: number;
  combinedPercent: number;
  overallRank: number | null;
  classRank: number | null;
  schoolRank: number | null;
  subjects: {
    olympiadId: string;
    title: string;
    score: number;
    maxScore: number;
    percent: number;
    rank: number | null;
    medal: string | null;
  }[];
};
