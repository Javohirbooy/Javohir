import { redirect } from "next/navigation";
import { getOlympiadGateState } from "@/app/actions/olympiad-participant";
import { isOlympiadExamTerminalStatus } from "@/lib/olympiad/exam-state-machine";
import { OlympiadWaitingRoom } from "@/components/olympiad/olympiad-waiting-room";

export const metadata = {
  title: "Kutish xonasi",
  robots: { index: false, follow: false } as const,
};

export default async function OlympiadWaitingPage() {
  const g = await getOlympiadGateState();
  if (!g.ok) redirect("/olympiada/join");
  if (g.sessionStatus === "RULES_PENDING") redirect("/olympiada/rules");
  if (isOlympiadExamTerminalStatus(g.sessionStatus) || g.sessionStatus === "SUBMITTING") redirect("/olympiada/submitted");
  if (g.sessionStatus === "ACTIVE") redirect(`/olympiada/test/${g.sessionId}`);

  return <OlympiadWaitingRoom />;
}
