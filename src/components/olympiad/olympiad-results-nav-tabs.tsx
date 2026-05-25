import Link from "next/link";
import { cn } from "@/lib/utils";

export function OlympiadResultsNavTabs({
  basePath,
  active,
}: {
  basePath: string;
  active: "single" | "bundle";
}) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-white/10">
      <Link
        href={`${basePath}/natijalar`}
        className={cn(
          "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
          active === "single"
            ? "bg-emerald-600 text-white"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200",
        )}
      >
        Alohida olimpiadalar
      </Link>
      <Link
        href={`${basePath}/natijalar/paket`}
        className={cn(
          "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
          active === "bundle"
            ? "bg-emerald-600 text-white"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200",
        )}
      >
        Ko‘p fanli paketlar
      </Link>
    </div>
  );
}
