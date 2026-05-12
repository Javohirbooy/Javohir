import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sertifikatni tekshirish",
  description: "Olimpiada sertifikatining haqiqiyligini tekshiring.",
  robots: { index: true, follow: true },
};

export default function SertifikatniTekshirishLayout({ children }: { children: React.ReactNode }) {
  return children;
}
