import { SectionTitle } from "@/components/ui/section-title";
import { Card } from "@/components/ui/card";
import { BRAND } from "@/lib/brand";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
      <SectionTitle
        onDark
        title="Biz haqimizda"
        subtitle={`${BRAND.name} — barcha maktab fanlari uchun monitoring, testlar va rollar asosidagi zamonaviy ta’lim platformasi skeleti.`}
      />
      <Card className="mt-10 border-white/15 bg-white/[0.06] p-8 text-white/80 backdrop-blur-xl">
        <p className="leading-relaxed">
          Loyiha Next.js App Router, Prisma va NextAuth ustida qurilgan. Admin, o‘qituvchi va o‘quvchi kabinetlari alohida UX bilan ajratilgan;
          dizayn universal ta’lim SaaS yo‘nalishida — barcha fanlar uchun yagona vizual tizim.
        </p>
        <p className="mt-4 leading-relaxed text-white/65">
          Ma’lumotlar bazasi sinflar, fanlar, testlar va natijalarni qo‘llab-quvvatlaydi. Keyingi bosqichda kontent boshqaruvi va analytics chuqurlashtiriladi.
        </p>
      </Card>
    </div>
  );
}
