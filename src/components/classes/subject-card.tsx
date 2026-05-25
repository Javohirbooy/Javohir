import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubjectVisual } from "@/components/classes/subject-visual";
import { loginUrlWithCallback } from "@/lib/auth/login-redirect";

type Props = {
  title: string;
  description: string;
  emoji: string;
  testId: string | null;
  canAccessTests: boolean;
};

export function SubjectCard({ title, description, emoji, testId, canAccessTests }: Props) {
  return (
    <Card className="flex h-full flex-col border-slate-200/60 bg-white/95 text-slate-900 shadow-xl shadow-slate-900/10 backdrop-blur-xl transition hover:border-violet-200/80 hover:shadow-violet-500/10">
      <div className="flex items-start gap-4">
        <SubjectVisual title={title} emoji={emoji} className="h-14 w-14" iconClassName="h-7 w-7" />
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="line-clamp-3 text-slate-600">{description}</CardDescription>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {testId && canAccessTests ? (
          <Button href={`/testlar/${testId}`} variant="primary" className="px-4 py-2 text-sm">
            Testni boshlash
          </Button>
        ) : testId ? (
          <Button
            href={loginUrlWithCallback(`/testlar/${testId}`)}
            variant="primary"
            className="px-4 py-2 text-sm"
          >
            Kirish — testni boshlash
          </Button>
        ) : null}
        <Button variant="secondary" className="px-4 py-2 text-sm opacity-80" disabled>
          Mavzular
        </Button>
      </div>
    </Card>
  );
}
