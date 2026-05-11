import { redirect } from "next/navigation";
import { getOlympiadPostSubmitState } from "@/app/actions/olympiad-participant";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Yuborildi",
  robots: { index: false, follow: false } as const,
};

export default async function OlympiadSubmittedPage() {
  const s = await getOlympiadPostSubmitState();
  if (!s.ok) redirect("/olympiada/join");
  if (s.status === "ACTIVE") redirect(`/olympiada/test/${s.sessionId}`);
  if (s.status === "RULES_PENDING") redirect("/olympiada/rules");
  if (s.status === "WAITING") redirect("/olympiada/waiting-room");

  return (
    <Card className="border-white/20 bg-white/95 p-6 text-center shadow-xl">
      <h1 className="text-xl font-bold text-slate-900">Javoblaringiz qabul qilindi</h1>
      <p className="mt-2 text-sm text-slate-600">{s.title}</p>
      {s.submittedAt ? (
        <p className="mt-1 text-xs text-slate-500">Vaqt: {new Date(s.submittedAt).toLocaleString()}</p>
      ) : null}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button href="/olympiada/results" variant="secondary">
          Natijalar
        </Button>
        <Button href="/" variant="outline">
          Bosh sahifa
        </Button>
      </div>
    </Card>
  );
}
