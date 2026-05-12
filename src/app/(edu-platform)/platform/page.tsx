import Link from "next/link";
import { cn } from "@/lib/utils";
import { eduTypography } from "@/lib/design-system/typography";

const cards = [
  { href: "/learning", title: "Learning", body: "XP, seriya, ko‘nikma daraxti.", accent: "from-violet-500/20 to-sky-500/10" },
  { href: "/classroom", title: "Classroom", body: "Kurslar va topshiriqlar.", accent: "from-teal-500/20 to-emerald-500/10" },
  { href: "/contest", title: "Contest", body: "Jonli reyting va muammolar.", accent: "from-sky-500/25 to-blue-600/10" },
  { href: "/workspace", title: "Workspace", body: "IDE, testlar, konsol.", accent: "from-emerald-500/25 to-lime-500/10" },
] as const;

export default function PlatformHubPage() {
  return (
    <div className="space-y-8 py-6">
      <div>
        <h2 className={cn(eduTypography.h2, "text-slate-900 dark:text-slate-50")}>Multi-mode UI arxitekturasi</h2>
        <p className={cn(eduTypography.body, "mt-2 max-w-2xl text-slate-600 dark:text-slate-300")}>
          Har bir rejim o‘z tartib va vizual tiliga ega; stress darajasi chrome zichligi va animatsiyalarni moslaydi. Bu sahifalar namuna — keyingi bosqichda
          backend va realtime kanallar ulanadi.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              className={cn(
                "block rounded-2xl border border-slate-200/80 bg-gradient-to-br p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:from-slate-900 dark:to-slate-950",
                c.accent,
              )}
            >
              <h3 className={cn(eduTypography.h3, "text-slate-900 dark:text-white")}>{c.title}</h3>
              <p className={cn(eduTypography.body, "mt-2 text-slate-600 dark:text-slate-300")}>{c.body}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-sky-600 dark:text-sky-400">Ochish →</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
