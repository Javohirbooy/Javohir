import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SubjectCard } from "@/components/classes/subject-card";
import { SectionTitle } from "@/components/ui/section-title";
import { Badge } from "@/components/ui/badge";

type Props = { params: Promise<{ number: string }> };

export default async function GradeDetailPage({ params }: Props) {
  const { number: raw } = await params;
  const number = Number.parseInt(raw, 10);
  if (Number.isNaN(number) || number < 1 || number > 11) notFound();

  const grade = await prisma.grade.findUnique({
    where: { number },
    include: {
      subjects: {
        orderBy: { order: "asc" },
        include: { tests: { take: 1, orderBy: { title: "asc" } } },
      },
    },
  });
  if (!grade) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
      <div className="flex flex-wrap items-center gap-3">
        <Badge className="border-violet-400/40 bg-violet-500/20 text-violet-100 ring-1 ring-white/15">{grade.number}-sinf</Badge>
        <h1 className="text-3xl font-extrabold text-white sm:text-4xl">{grade.name}</h1>
      </div>
      <SectionTitle
        onDark
        className="mt-10"
        title="Fanlar va testlar"
        subtitle="Har bir fan uchun kartochka, qisqacha tavsif va tezkor testga havola — IQ Monitoring barcha fanlar uchun bir xil professional UX."
      />
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {grade.subjects.map((s) => (
          <SubjectCard
            key={s.id}
            title={s.title}
            description={s.description}
            emoji={s.imageEmoji}
            testId={s.tests[0]?.id ?? null}
          />
        ))}
      </div>
    </div>
  );
}
