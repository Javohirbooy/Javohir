"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Row = { name: string; value: number };

export function MiniBarChart({ data }: { data: Row[] }) {
  return (
    <div className="h-56 w-full min-w-0 min-h-[14rem]">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: "rgba(15,23,42,0.95)",
              border: "1px solid rgba(148,163,184,0.3)",
              borderRadius: 12,
            }}
            labelStyle={{ color: "#e2e8f0" }}
          />
          <Bar dataKey="value" fill="url(#barGrad)" radius={[8, 8, 0, 0]} />
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
