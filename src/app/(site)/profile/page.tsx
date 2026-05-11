import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ProfileSettingsForm } from "@/components/profile/profile-settings-form";
import { prisma } from "@/lib/prisma";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: { absolute: `Profil sozlamalari | ${BRAND.name}` },
};

function isProfileRole(role: string | undefined): boolean {
  return role === "TEACHER" || role === "ADMIN";
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/kirish");
  if (!isProfileRole(session.user.role)) redirect("/");

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, avatarUrl: true },
  });
  if (!me) redirect("/kirish");

  return (
    <section className="px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <h1 className="text-center font-display text-3xl font-bold text-slate-900 dark:text-slate-100">Profil sozlamalari</h1>
        <p className="text-center text-sm text-slate-600 dark:text-slate-300">Ism va avatarni yangilang. O&apos;zgarishlar faqat o&apos;zingizga tegishli bo&apos;ladi.</p>
        <ProfileSettingsForm initialName={me.name} initialAvatarUrl={me.avatarUrl} />
      </div>
    </section>
  );
}
