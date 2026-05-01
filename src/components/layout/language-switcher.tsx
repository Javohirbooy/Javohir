"use client";

import { setLocale } from "@/app/actions/locale";
import type { AppLocale } from "@/lib/i18n/constants";
import { cn } from "@/lib/utils";

const options: { value: AppLocale; label: string }[] = [
  { value: "uz", label: "UZ" },
  { value: "ru", label: "RU" },
  { value: "en", label: "EN" },
];

export function LanguageSwitcher({ current, className }: { current: AppLocale; className?: string }) {
  return (
    <form
      action={setLocale}
      className={cn("flex items-center gap-0.5 rounded-xl border border-white/15 bg-white/5 p-0.5", className)}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="submit"
          name="locale"
          value={o.value}
          className={cn(
            "flex-1 rounded-lg px-2 py-1 text-center text-[0.65rem] font-bold uppercase tracking-wide transition",
            current === o.value ? "bg-white/20 text-white shadow-inner ring-1 ring-white/25" : "text-white/55 hover:bg-white/10 hover:text-white",
          )}
        >
          {o.label}
        </button>
      ))}
    </form>
  );
}
