"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Variant = "success" | "error" | "info";

type ToastItem = { id: string; message: string; variant: Variant };

type ToastApi = {
  toast: (message: string, variant?: Variant) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  return (
    ctx ?? {
      toast: () => {},
    }
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, variant: Variant = "info") => {
    const id = globalThis.crypto?.randomUUID?.() ?? String(Date.now());
    setItems((prev) => [...prev, { id, message, variant }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[250] flex max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6"
        style={{
          paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
          paddingRight: "max(0.5rem, env(safe-area-inset-right, 0px))",
        }}
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto rounded-2xl border px-4 py-3 text-sm font-medium shadow-xl backdrop-blur-md",
              t.variant === "success" &&
                "border-emerald-200 bg-emerald-50/95 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-100",
              t.variant === "error" &&
                "border-rose-200 bg-rose-50/95 text-rose-900 dark:border-rose-900 dark:bg-rose-950/90 dark:text-rose-100",
              t.variant === "info" &&
                "border-slate-200 bg-white/95 text-slate-800 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100",
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
