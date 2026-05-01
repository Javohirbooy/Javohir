"use client";

import type { CSSProperties } from "react";

const orbs = [
  { className: "left-[-10%] top-[-15%] h-[min(42rem,90vw)] w-[min(42rem,90vw)] bg-emerald-500/34 blur-[100px]", delay: 0, duration: 22 },
  { className: "right-[-15%] top-[10%] h-[min(36rem,80vw)] w-[min(36rem,80vw)] bg-green-400/25 blur-[90px]", delay: 0.4, duration: 25 },
  { className: "left-[20%] bottom-[-20%] h-[min(32rem,75vw)] w-[min(32rem,75vw)] bg-teal-400/24 blur-[100px]", delay: 0.8, duration: 28 },
  { className: "right-[25%] bottom-[5%] h-[min(28rem,60vw)] w-[min(28rem,60vw)] bg-slate-200/10 blur-[80px]", delay: 1.2, duration: 31 },
];

/**
 * Floating gradient orbs — CSS-only animation (no framer-motion) for lighter JS on marketing pages.
 */
export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(2,6,23,0.55)_100%)]" />
      {orbs.map((o, i) => (
        <div
          key={i}
          className={`absolute rounded-full iq-ambient-orb ${o.className}`}
          style={
            {
              "--iq-drift-duration": `${o.duration}s`,
              "--iq-drift-delay": `${o.delay}s`,
            } as CSSProperties
          }
        />
      ))}
      <div
        className="iq-ambient-sheen absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)",
          backgroundSize: "200% 200%",
        }}
      />
    </div>
  );
}
