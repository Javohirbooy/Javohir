const map: Record<string, { from: string; to: string; ring: string; glow: string }> = {
  rose: { from: "from-emerald-400", to: "to-green-500", ring: "ring-emerald-300/55", glow: "shadow-emerald-500/30" },
  orange: { from: "from-green-400", to: "to-emerald-500", ring: "ring-green-300/55", glow: "shadow-green-500/30" },
  amber: { from: "from-lime-300", to: "to-emerald-500", ring: "ring-lime-300/55", glow: "shadow-lime-500/28" },
  lime: { from: "from-lime-400", to: "to-green-500", ring: "ring-lime-300/55", glow: "shadow-lime-500/30" },
  emerald: { from: "from-emerald-400", to: "to-teal-500", ring: "ring-emerald-300/55", glow: "shadow-emerald-500/30" },
  teal: { from: "from-teal-400", to: "to-emerald-500", ring: "ring-teal-300/55", glow: "shadow-teal-500/30" },
  cyan: { from: "from-green-400", to: "to-teal-500", ring: "ring-green-300/55", glow: "shadow-green-500/30" },
  sky: { from: "from-emerald-400", to: "to-green-600", ring: "ring-emerald-300/55", glow: "shadow-emerald-500/30" },
  indigo: { from: "from-green-400", to: "to-emerald-600", ring: "ring-green-300/55", glow: "shadow-green-500/30" },
  violet: { from: "from-emerald-400", to: "to-teal-600", ring: "ring-emerald-300/55", glow: "shadow-emerald-500/30" },
  fuchsia: { from: "from-teal-400", to: "to-green-500", ring: "ring-teal-300/55", glow: "shadow-teal-500/30" },
};

export function gradeGradient(colorKey: string) {
  return map[colorKey] ?? map.emerald!;
}
