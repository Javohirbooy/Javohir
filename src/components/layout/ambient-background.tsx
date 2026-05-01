"use client";

import type { CSSProperties } from "react";

const orbs = [
  { className: "left-[-10%] top-[-12%] h-[min(38rem,88vw)] w-[min(38rem,88vw)] bg-emerald-500/22 blur-[100px] dark:bg-emerald-600/16", delay: 0, duration: 26 },
  { className: "right-[-12%] bottom-[-8%] h-[min(32rem,75vw)] w-[min(32rem,75vw)] bg-teal-400/18 blur-[95px] dark:bg-teal-500/12", delay: 0.6, duration: 30 },
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
        className="iq-ambient-sheen absolute inset-0 opacity-[0.06] dark:opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)",
          backgroundSize: "200% 200%",
        }}
      />
    </div>
  );
}
