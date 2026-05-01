import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { TestCodeForm } from "@/components/student/test-code-form";
import { DashboardCard } from "@/components/dashboard/dashboard-card";

type Props = { searchParams: Promise<{ next?: string }> };

export default async function StudentTestCodePage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/kirish");
  if (session.user.role !== "STUDENT") redirect("/");

  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/testlar/") ? sp.next : undefined;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Testga kirish</h1>
        <p className="mt-1 text-sm text-white/60">
          IQ Monitoring — o‘qituvchi bergan kod bilan test ochiladi. Agar kod bir nechta fanga biriktirilgan bo‘lsa, barcha testlar{" "}
          <Link href="/oquvchi/monitoring-testlar" className="font-semibold text-emerald-200 underline-offset-2 hover:underline">
            Monitoring
          </Link>{" "}
          sahifasida ro‘yxat ko‘rinadi.
        </p>
      </div>
      <TestCodeForm next={next} />
      <DashboardCard>
        <p className="text-sm text-white/70">
          Kod noto‘g‘ri bo‘lsa, o‘qituvchingizdan yangi kod so‘rang. Yangi kod kiritilsa, avvalgi ruxsat almashtiriladi. Bir nechta fan
          bitta kodda bo‘lsa, har bir testni alohida yakunlang.
        </p>
      </DashboardCard>
    </div>
  );
}
