import { HomePageBody, HeroOnlyFallback } from "@/components/home/home-page-body";
import { getServerLocale } from "@/lib/i18n/resolve-locale";
import { DEFAULT_LOCALE } from "@/lib/i18n/constants";
import { metadataFromSeoKey } from "@/lib/seo/public-page-metadata";

export async function generateMetadata() {
  try {
    const locale = await getServerLocale();
    return metadataFromSeoKey(locale, "home");
  } catch {
    return metadataFromSeoKey(DEFAULT_LOCALE, "home");
  }
}

/** Bosh sahifa statistikasi `unstable_cache` bilan ~120s; DB yuki kamroq */
export const revalidate = 120;

export default async function HomePage() {
  try {
    return await HomePageBody();
  } catch (err) {
    console.error("[home-page]", err);
    try {
      return await HomePageBody({ skipDbSections: true });
    } catch (err2) {
      console.error("[home-page-fallback]", err2);
      return <HeroOnlyFallback />;
    }
  }
}
