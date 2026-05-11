import { ContactForm } from "@/components/site/contact-form";
import { BRAND } from "@/lib/brand";
import { getServerLocale } from "@/lib/i18n/resolve-locale";
import { metadataFromSeoKey } from "@/lib/seo/public-page-metadata";

export async function generateMetadata() {
  const locale = await getServerLocale();
  return metadataFromSeoKey(locale, "aloqa");
}

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-center font-display text-3xl font-bold text-slate-900 dark:text-slate-100">Aloqa</h1>
      <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
        {BRAND.name} platformasi bo‘yicha savol yoki takliflaringizni yuboring.
      </p>
      <div className="mt-10">
        <ContactForm />
      </div>
    </section>
  );
}
