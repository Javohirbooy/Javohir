import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  description: string;
  emoji: string;
  testId: string | null;
};

export function SubjectCard({ title, description, emoji, testId }: Props) {
  return (
    <Card className="flex h-full flex-col border-slate-200/60 bg-white/95 text-slate-900 shadow-xl shadow-slate-900/10 backdrop-blur-xl transition hover:border-violet-200/80 hover:shadow-violet-500/10">
      <div className="flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 via-fuchsia-50 to-cyan-100 text-3xl shadow-inner ring-1 ring-violet-100/80">
          {emoji}
        </span>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="line-clamp-3 text-slate-600">{description}</CardDescription>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {testId ? (
          <Button href={`/testlar/${testId}`} variant="primary" className="px-4 py-2 text-sm">
            Testni boshlash
          </Button>
        ) : null}
        <Button variant="secondary" className="px-4 py-2 text-sm opacity-80" disabled>
          Mavzular (demo)
        </Button>
      </div>
    </Card>
  );
}
