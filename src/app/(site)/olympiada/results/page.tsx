import { redirect } from "next/navigation";
import { getOlympiadPostSubmitState } from "@/app/actions/olympiad-participant";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  if (s.status !== "SUBMITTED") redirect("/olympiada/waiting-room");

  const r = s.result;

  return (
    <Card className="border-white/20 bg-white/95 p-6 shadow-xl">
      <h1 className="text-xl font-bold text-slate-900">Natijalar</h1>
      <p className="mt-1 text-sm text-slate-600">{s.title}</p>

      {!r || !r.published ? (
        <p className="mt-4 text-sm text-amber-800">
          Natijalar hali e&apos;lon qilinmagan. Organizatorlar tasdiqlagach, bu yerda ball va reyting ko‘rinadi.
        </p>
      ) : (
        <div className="mt-6 space-y-2 text-slate-800">
          <p className="text-4xl font-black text-sky-700">{r.score}%</p>
          {r.maxScore != null ? (
            <p className="text-sm text-slate-600">Maksimal: {r.maxScore} ball asosida foizlashgan.</p>
          ) : null}
          {r.rank != null ? <p className="text-sm font-semibold">Reyting o‘rni: {r.rank}</p> : null}
          <p className="text-xs text-slate-500">
            Sertifikat yuklab olish keyingi versiyada qo‘shiladi; hozircha natijalarni olimpiada tashkilotchisidan so‘rashingiz mumkin.
          </p>
        </div>
      )}

      <div className="mt-8">
        <Button href="/" variant="secondary">
          Bosh sahifa
        </Button>
      </div>
    </Card>
  );
}
