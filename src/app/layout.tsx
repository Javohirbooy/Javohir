import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { CornerClock } from "@/components/layout/corner-clock";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { getServerLocale } from "@/lib/i18n/resolve-locale";
import { BRAND } from "@/lib/brand";
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from "@/lib/og/dimensions";
import { getSiteUrl } from "@/lib/env";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/**
 * Faqat umumiy defaults — har bir ochiq sahifa o‘z `generateMetadata` bilan
 * title, description, canonical va OpenGraph ni to‘ldirib, merosdagi dublikatlarni oldini oladi.
 */
export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: BRAND.name,
    template: `%s | ${BRAND.name}`,
  },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    images: [
      {
        url: "/og",
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        alt: BRAND.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [
      {
        url: "/og",
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        alt: BRAND.name,
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ecfdf5" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  const locale = await getServerLocale();
  return (
    <html lang={locale} suppressHydrationWarning className={`${inter.variable} ${poppins.variable} h-full antialiased`}>
      <body className="iq-content iq-theme min-h-full font-sans text-slate-800 antialiased dark:text-slate-100">
        <ThemeProvider>
          <AuthSessionProvider>
            <LocaleProvider locale={locale}>
              <ToastProvider>
                {children}
                <CornerClock />
              </ToastProvider>
            </LocaleProvider>
          </AuthSessionProvider>
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
