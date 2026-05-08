import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">404</p>
      <h1 className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-slate-100">Sahifa topilmadi</h1>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
        Kiritilgan manzil mavjud emas yoki o‘chirib yuborilgan bo‘lishi mumkin.
      </p>
      <Button href="/" className="mt-6 px-5">
        Bosh sahifaga qaytish
      </Button>
      <Link href="/kirish" className="mt-3 text-sm text-emerald-700 hover:underline dark:text-emerald-300">
        Kirish sahifasi
      </Link>
    </div>
  );
}
