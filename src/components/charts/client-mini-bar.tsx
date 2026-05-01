"use client";

import dynamic from "next/dynamic";

const MiniBarChart = dynamic(
  () => import("@/components/charts/mini-bar").then((m) => m.MiniBarChart),
  {
    ssr: false,
    loading: () => <div className="h-56 w-full min-w-0 animate-pulse rounded-2xl bg-white/5" />,
  },
);

type Row = { name: string; value: number };

export function ClientMiniBar({ data }: { data: Row[] }) {
  return <MiniBarChart data={data} />;
}
