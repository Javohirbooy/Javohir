import { redirect } from "next/navigation";
import { getOlympiadPostSubmitState } from "@/app/actions/olympiad-participant";
import { OlympiadResultsClient } from "@/components/olympiad/olympiad-results-client";

export const metadata = {
  title: "Olimpiada natijalari",
  robots: { index: false, follow: false } as const,
};

export default async function OlympiadResultsPage() {
  const s = await getOlympiadPostSubmitState();
  if (!s.ok) redirect("/olympiada/join");
  if (s.status === "ACTIVE") redirect(`/olympiada/test/${s.sessionId}`);
  if (s.status === "RULES_PENDING") redirect("/olympiada/rules");
  if (s.status === "WAITING") redirect("/olympiada/waiting-room");
  if (s.status === "SUBMITTING") redirect("/olympiada/submitted");
  if (s.status !== "SUBMITTED" && s.status !== "FINALIZED") redirect("/olympiada/waiting-room");

  const r = s.result;

  return (
    <OlympiadResultsClient
      title={s.title}
      published={Boolean(r?.published)}
      result={
        r
          ? {
              score: r.score,
              maxScore: r.maxScore,
              rank: r.rank,
              certificate: r.certificate
                ? {
                    verifyPublicId: r.certificate.verifyPublicId,
                    pdfUrl: r.certificate.pdfUrl,
                    revokedAt: r.certificate.revokedAt,
                  }
                : null,
            }
          : null
      }
    />
  );
}
