import { redirect } from "next/navigation";
import { getOlympiadExamPayload, getOlympiadSessionForCurrentCookie } from "@/app/actions/olympiad-participant";
import { OlympiadExamRunner } from "@/components/olympiad/olympiad-exam-runner";

export default async function OlympiadTestPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const sess = await getOlympiadSessionForCurrentCookie();
  if (!sess || sess.id !== sessionId) redirect("/olympiada/join");
  if (sess.status === "SUBMITTED" || sess.status === "FINALIZED" || sess.status === "SUBMITTING") redirect("/olympiada/submitted");
  if (sess.status !== "ACTIVE") redirect("/olympiada/waiting-room");

  const payload = await getOlympiadExamPayload(sessionId);
  if (!payload.ok) redirect("/olympiada/waiting-room");

  return (
    <OlympiadExamRunner
      sessionId={sessionId}
      title={payload.title}
      questions={payload.questions}
      serverEndsAt={payload.serverEndsAt}
      serverNow={payload.serverNow}
      antiCheatStrictness={payload.antiCheatStrictness}
      initialAnswers={payload.initialAnswers}
      signingMode={payload.signingMode}
      enableExamWatermark={payload.enableExamWatermark}
      watermarkText={payload.watermarkText}
      enableMultiTabDetect={payload.enableMultiTabDetect}
      serverAutosaveSeq={payload.serverAutosaveSeq}
    />
  );
}
