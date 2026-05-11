import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { getServerLocale } from "@/lib/i18n/resolve-locale";
import { metadataFromSeoKey } from "@/lib/seo/public-page-metadata";

export async function generateMetadata() {
  const locale = await getServerLocale();
  return metadataFromSeoKey(locale, "premium");
}

export default function PremiumPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
        Premium
      </p>
      <h1 className="mt-3 text-center font-display text-3xl font-extrabold text-slate-900 dark:text-slate-100 sm:text-4xl">
        {BRAND.name} — kengaytirilgan imkoniyatlar
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        Prioritet qo‘llab-quvvatlash, kengaytirilgan hisobotlar va maktab uchun moslashuv — premium rejasi tez orada to‘liq
        faollashtiriladi. Hozircha barcha asosiy funksiyalar standart rejimda mavjud.
      </p>
      <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Button href="/register" variant="primary" className="min-w-[12rem]">
          Ro‘yxatdan o‘tish
        </Button>
        <Button href="/aloqa" variant="outline" className="min-w-[12rem]">
          Aloqa
        </Button>
      </div>
      <p className="mt-10 text-center text-sm text-slate-500 dark:text-slate-400">
        <Link href="/" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
          ← Bosh sahifa
        </Link>
      </p>
    </section>
  );
}
