import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Texnik xizmat",
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-slate-950 px-6 py-16 text-center text-slate-100">
      <h1 className="text-2xl font-bold tracking-tight">Texnik xizmat</h1>
      <p className="mt-4 max-w-md text-sm text-slate-400">
        Platforma vaqtincha yangilanmoqda. Iltimos, birozdan keyin sahifani yangilab ko‘ring.
      </p>
    </div>
  );
}
