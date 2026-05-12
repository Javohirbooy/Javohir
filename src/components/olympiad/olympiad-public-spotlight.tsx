"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SectionTitle } from "@/components/ui/section-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Clock, Medal } from "lucide-react";

export type SpotlightCardWire = {
  id: string;
  title: string;
  slug: string;
  startsAt: string;
  endsAt: string | null;
  status: string;
  participantCount: number;
};

export type SpotlightWinnerWire = {
  score: number;
  rank: number | null;
  finalizedAt: string | null;
  olympiadTitle: string;
  displayName: string;
};

function formatRemain(ms: number) {
  if (ms <= 0) return "hozir";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d} kun ${h} soat`;
  if (h > 0) return `${h} soat ${m} daq`;
  return `${m} daq`;
}

function CountdownLine({ targetIso }: { targetIso: string }) {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    const t = () => {
      const end = new Date(targetIso).getTime();
      setMs(Math.max(0, end - Date.now()));
    };
    t();
    const id = window.setInterval(t, 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  if (ms == null) return <span className="text-slate-500">…</span>;
  return <span className="font-mono tabular-nums font-semibold text-sky-800">{formatRemain(ms)}</span>;
}

function medalForRank(rank: number | null) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "🏅";
}

export function OlympiadPublicSpotlight(props: {
  variant: "full" | "compact";
  upcoming: SpotlightCardWire[];
  active: SpotlightCardWire[];
  winners: SpotlightWinnerWire[];
}) {
  const { variant, upcoming, active, winners } = props;

  const showLists = variant === "full";
  const topUpcoming = variant === "compact" ? upcoming.slice(0, 2) : upcoming;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <SectionTitle
        onDark
        eyebrow="Olimpiadalar"
        title="Respublika miqyosidagi onlayn bellashuvlar"
        subtitle="Kirish kodi bilan xavfsiz qatnashish, jonli monitoring va rasmiy sertifikatlar — bitta zanjir."
      />

      <div className="mt-10 flex flex-wrap gap-3">
        <Button href="/olympiada/join" variant="primary" className="px-6 py-2.5 text-sm">
          Qatnashish
        </Button>
        <Button href="/sertifikatni-tekshirish" variant="glass" className="px-5 py-2.5 text-sm">
          Sertifikatni tekshirish
        </Button>
      </div>

      <div className={`mt-10 grid gap-6 ${showLists ? "lg:grid-cols-3" : "sm:grid-cols-2"}`}>
        <Card className="border-white/15 bg-white/[0.06] p-6 text-white backdrop-blur-md">
          <div className="flex items-center gap-2 text-cyan-200">
            <Clock className="h-5 w-5" aria-hidden />
            <p className="text-xs font-bold uppercase tracking-widest">Faol / hozirgi oyna</p>
          </div>
          <p className="mt-3 text-4xl font-black tabular-nums text-white">{active.length}</p>
          <p className="mt-1 text-sm text-white/60">Hozir qabul qilinayotgan olimpiadalar (vaqt oralig‘i bo‘yicha).</p>
        </Card>
        <Card className="border-white/15 bg-white/[0.06] p-6 text-white backdrop-blur-md">
          <div className="flex items-center gap-2 text-violet-200">
            <Users className="h-5 w-5" aria-hidden />
            <p className="text-xs font-bold uppercase tracking-widest">Navbatdagi startlar</p>
          </div>
          <p className="mt-3 text-4xl font-black tabular-nums text-white">{upcoming.length}</p>
          <p className="mt-1 text-sm text-white/60">Rejalashtirilgan startlar (kesh 60s).</p>
        </Card>
        {showLists ? (
          <Card className="border-amber-200/20 bg-gradient-to-br from-amber-500/15 to-orange-500/10 p-6 text-white backdrop-blur-md">
            <div className="flex items-center gap-2 text-amber-100">
              <Trophy className="h-5 w-5" aria-hidden />
              <p className="text-xs font-bold uppercase tracking-widest">So‘nggi podium</p>
            </div>
            <p className="mt-3 text-4xl font-black tabular-nums text-white">{winners.length}</p>
            <p className="mt-1 text-sm text-white/70">Yaqinda chop etilgan TOP-3 natijalar (anonim ishtirokchilar).</p>
          </Card>
        ) : null}
      </div>

      {topUpcoming.length > 0 ? (
        <div className="mt-10">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white/55">Tez orada</h3>
          <ul className="mt-4 space-y-3">
            {topUpcoming.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/90"
              >
                <span className="font-semibold">{c.title}</span>
                <span className="text-white/70">
                  boshlanishiga: <CountdownLine targetIso={c.startsAt} />
                </span>
                <span className="text-xs text-white/50">{c.participantCount} ro‘yxatdan o‘tgan</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showLists && active.length > 0 ? (
        <div className="mt-10">
          <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-200/90">Hozir ochiq</h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {active.map((c) => (
              <li key={c.id}>
                <Link
                  href="/olympiada/join"
                  className="block rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4 transition hover:border-emerald-300/50 hover:bg-emerald-500/15"
                >
                  <p className="font-bold text-white">{c.title}</p>
                  <p className="mt-1 text-xs text-white/65">{c.participantCount} ishtirokchi</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showLists && winners.length > 0 ? (
        <div className="mt-12">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-amber-200/90">
            <Medal className="h-4 w-4" aria-hidden />
            So‘nggi g‘oliblar
          </h3>
          <ul className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03]">
            {winners.map((w, i) => (
              <li key={`${w.displayName}-${w.olympiadTitle}-${i}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="text-lg" aria-hidden>
                  {medalForRank(w.rank)}
                </span>
                <span className="min-w-0 flex-1 font-medium text-white">
                  <span className="block truncate">{w.displayName}</span>
                  <span className="block truncate text-xs text-white/55">{w.olympiadTitle}</span>
                </span>
                <span className="tabular-nums text-cyan-200">{Math.round(w.score)}%</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
