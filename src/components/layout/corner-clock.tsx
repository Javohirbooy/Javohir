"use client";

import { useEffect, useState } from "react";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function fmtNow(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

/** Small fixed live clock at bottom-right. */
export function CornerClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div
      className="pointer-events-none fixed z-[80] hidden rounded-xl border border-emerald-400/35 bg-white/85 px-2.5 py-1 font-mono text-xs font-semibold text-emerald-900 shadow-[0_10px_24px_-12px_rgba(16,185,129,0.45)] backdrop-blur-md sm:block"
      style={{
        bottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
        right: "max(1rem, env(safe-area-inset-right, 0px))",
      }}
    >
      <span suppressHydrationWarning>{fmtNow(now)}</span>
    </div>
  );
}
