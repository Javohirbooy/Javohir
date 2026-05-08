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
import { getSiteUrl } from "@/lib/env";

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

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: `${BRAND.name} — universal ta’lim monitoringi`,
  description:
    "Maktab fanlari, sinflar, testlar va analytics — zamonaviy, professional va production-ready ta’lim platformasi.",
  alternates: { canonical: "/" },
  openGraph: {
    title: `${BRAND.name} — universal ta’lim monitoringi`,
    description:
      "Maktab fanlari, sinflar, testlar va analytics — zamonaviy, professional va production-ready ta’lim platformasi.",
    type: "website",
    locale: "uz_UZ",
    siteName: BRAND.name,
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} — universal ta’lim monitoringi`,
    description:
      "Maktab fanlari, sinflar, testlar va analytics — zamonaviy, professional va production-ready ta’lim platformasi.",
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
      </body>
    </html>
  );
}
