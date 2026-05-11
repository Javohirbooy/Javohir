import { redirect } from "next/navigation";
import { getOlympiadGateState } from "@/app/actions/olympiad-participant";
import { OlympiadRulesFlow } from "@/components/olympiad/olympiad-rules-flow";

export const metadata = {
  title: "Olimpiada qoidalari",
  robots: { index: false, follow: false } as const,
};

export default async function OlympiadRulesPage() {
  const g = await getOlympiadGateState();
  if (!g.ok) redirect("/olympiada/join");
  if (g.sessionStatus === "SUBMITTED") redirect("/olympiada/submitted");
  if (g.sessionStatus === "ACTIVE") redirect(`/olympiada/test/${g.sessionId}`);
  if (g.sessionStatus === "WAITING") redirect("/olympiada/waiting-room");

  return (
    <OlympiadRulesFlow
      title={g.olympiadTitle}
      durationMinutes={g.durationMinutes}
      antiCheatStrictness={g.antiCheatStrictness}
    />
  );
}
