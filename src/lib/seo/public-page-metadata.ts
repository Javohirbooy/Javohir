import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { buildOgImageMetadataEntry } from "@/lib/og/build-og-image-path";
import type { AppLocale } from "@/lib/i18n/constants";

import { publicSeoEntry, testDetailDescription, type PublicSeoKey } from "@/lib/seo/public-seo-messages";

/** Har bir SEO kaliti uchun yagona canonical yo‘l (token sahifalari bundan mustasno). */
export const SEO_CANONICAL_PATH: Record<Exclude<PublicSeoKey, "testNotFound">, string> = {
  home: "/",
  fanlar: "/fanlar",
  sinflar: "/sinflar",
  testlar: "/testlar",
  kirish: "/kirish",
  register: "/register",
  registerDisabled: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  aloqa: "/aloqa",
  bizHaqimizda: "/biz-haqimizda",
  reyting: "/reyting",
  premium: "/premium",
  verifyEmail: "/verify-email",
};

function ogLocaleTag(locale: AppLocale): string {
  if (locale === "uz") return "uz_UZ";
  if (locale === "ru") return "ru_RU";
  return "en_US";
}

function normalizePath(path: string): string {
  if (!path.startsWith("/")) return `/${path}`;
  return path;
}

/**
 * Oddiy ichki sahifalar: `title` shablon bilan `%s | ${BRAND.name}` ko‘rinishida birlashtiriladi.
 * Canonical bitta — `alternates.canonical`.
 */
export function buildPublicPageMetadata(options: {
  locale: AppLocale;
  canonicalPath: string;
  /** Shablondagi qisqa sarlavha (masalan "Fanlar") yoki to‘liq matn — `titleMode` orqali */
  title: string;
  description: string;
  /** OG rasmidagi ikkinchi qator; berilmasa `description` ishlatiladi */
  ogSubtitle?: string;
  titleMode?: "template" | "absolute";
  robots?: Metadata["robots"];
}): Metadata {
  const canonical = normalizePath(options.canonicalPath);
  const titleField =
    options.titleMode === "absolute"
      ? ({ absolute: options.title } as const)
      : options.title;

  const ogLine = (options.ogSubtitle ?? options.description).trim();
  const ogImage = buildOgImageMetadataEntry({ title: options.title, subtitle: ogLine }, options.title);

  return {
    title: titleField,
    description: options.description,
    alternates: {
      canonical,
      /** Kelajakda `/uz/...`, `/ru/...` URLlari bo‘lsa shu yerga to‘liq hreflang qo‘shiladi. */
      languages: { "x-default": canonical },
    },
    robots: options.robots ?? { index: true, follow: true },
    openGraph: {
      title: options.title,
      description: options.description,
      url: canonical,
      siteName: BRAND.name,
      locale: ogLocaleTag(options.locale),
      type: "website",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: options.title,
      description: options.description,
      images: [ogImage],
    },
  };
}

export function metadataFromSeoKey(
  locale: AppLocale,
  key: Exclude<PublicSeoKey, "testNotFound">,
  opts?: { robots?: Metadata["robots"]; titleMode?: "template" | "absolute" },
): Metadata {
  const entry = publicSeoEntry(locale, key);
  const canonicalPath = SEO_CANONICAL_PATH[key];
  return buildPublicPageMetadata({
    locale,
    canonicalPath,
    title: entry.title,
    description: entry.description,
    titleMode: opts?.titleMode ?? (key === "home" ? "absolute" : "template"),
    robots: opts?.robots,
  });
}

export function buildTestDetailMetadata(options: {
  locale: AppLocale;
  testId: string;
  testTitle: string;
  testDescription: string | null;
  gradeNumber: number;
  subjectTitle: string;
}): Metadata {
  const canonicalPath = `/testlar/${options.testId}`;
  const baseDesc = testDetailDescription(
    options.locale,
    options.testTitle,
    options.gradeNumber,
    options.subjectTitle,
  );
  const raw = options.testDescription?.trim();
  const description =
    raw && raw.length > 0 ? (raw.length > 160 ? `${raw.slice(0, 157)}…` : raw) : baseDesc;

  return buildPublicPageMetadata({
    locale: options.locale,
    canonicalPath,
    title: options.testTitle,
    description,
    ogSubtitle: baseDesc,
    titleMode: "template",
    robots: { index: true, follow: true },
  });
}
