import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { CornerClock } from "@/components/layout/corner-clock";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { getServerLocale } from "@/lib/i18n/resolve-locale";
import { BRAND } from "@/lib/brand";

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
  title: `${BRAND.name} — universal ta’lim monitoringi`,
  description:
    "Maktab fanlari, sinflar, testlar va analytics — zamonaviy, professional va production-ready ta’lim platformasi.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ecfdf5",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getServerLocale();
  return (
    <html lang={locale} className={`${inter.variable} ${poppins.variable} h-full antialiased`}>
      <body className="iq-content iq-theme min-h-full font-sans text-slate-100 antialiased">
        <AuthSessionProvider>
          <LocaleProvider locale={locale}>
            {children}
            <CornerClock />
          </LocaleProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
