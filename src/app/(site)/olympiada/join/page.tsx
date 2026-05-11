import type { Metadata } from "next";
import { OlympiadJoinForm } from "@/components/olympiad/olympiad-join-form";

export const metadata: Metadata = {
  title: "Olimpiadaga qo‘shilish",
  description: "Maxsus kod bilan xavfsiz olimpiada testiga kirish.",
  alternates: { canonical: "/olympiada/join" },
  openGraph: {
    title: "Olimpiadaga qo‘shilish",
    description: "Maxsus kod bilan xavfsiz olimpiada testiga kirish.",
    url: "/olympiada/join",
  },
  robots: { index: true, follow: true },
};

export default function OlympiadJoinPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Olimpiadaga qo‘shilish</h1>
        <p className="mt-2 text-sm text-white/75">
          Shaxsiy ma’lumotlaringiz va kirish kodingiz serverda xavfsiz qayd etiladi. Bir necha marta noto‘g‘ri kod kiritish
          cheklanadi.
        </p>
      </div>
      <OlympiadJoinForm />
    </div>
  );
}
