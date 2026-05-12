import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export type OlympiadSpotlightCard = {
  id: string;
  title: string;
  slug: string;
  startsAt: Date;
  endsAt: Date | null;
  status: string;
  participantCount: number;
};

export type OlympiadWinnerRow = {
  score: number;
  rank: number | null;
  finalizedAt: Date | null;
  olympiadTitle: string;
  displayName: string;
};

/**
 * Ochiq marketing / bosh sahifa: rejalashtirilgan va hozir davom etayotgan olimpiadalar + so‘nggi podium.
 */
export async function getOlympiadPublicSpotlight(): Promise<{
  upcoming: OlympiadSpotlightCard[];
  active: OlympiadSpotlightCard[];
  winners: OlympiadWinnerRow[];
}> {
  const now = new Date();

  const [upcoming, active, rawWinners] = await Promise.all([
    prisma.olympiad.findMany({
      where: {
        status: { in: ["SCHEDULED", "PAUSED"] },
        startsAt: { gt: now },
      },
      orderBy: { startsAt: "asc" },
      take: 6,
      select: {
        id: true,
        title: true,
        slug: true,
        startsAt: true,
        endsAt: true,
        status: true,
        _count: { select: { participants: true } },
      },
    }),
    prisma.olympiad.findMany({
      where: {
        status: { in: ["SCHEDULED", "PAUSED"] },
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      orderBy: { startsAt: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        slug: true,
        startsAt: true,
        endsAt: true,
        status: true,
        _count: { select: { participants: true } },
      },
    }),
    prisma.olympiadResult.findMany({
      where: { published: true, rank: { lte: 3 } },
      orderBy: [{ finalizedAt: "desc" }, { createdAt: "desc" }],
      take: 8,
      select: {
        score: true,
        rank: true,
        finalizedAt: true,
        createdAt: true,
        olympiad: { select: { title: true } },
        participant: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const winners: OlympiadWinnerRow[] = rawWinners.map((r) => ({
    score: r.score ?? 0,
    rank: r.rank,
    finalizedAt: r.finalizedAt ?? r.createdAt,
    olympiadTitle: r.olympiad.title,
    displayName: `${r.participant.firstName} ${r.participant.lastName}`.trim(),
  }));

  const mapCard = (o: (typeof upcoming)[number]): OlympiadSpotlightCard => ({
    id: o.id,
    title: o.title,
    slug: o.slug,
    startsAt: o.startsAt,
    endsAt: o.endsAt,
    status: o.status,
    participantCount: o._count.participants,
  });

  return {
    upcoming: upcoming.map(mapCard),
    active: active.map(mapCard),
    winners,
  };
}

/** Bosh sahifa / o‘quvchi paneli uchun kesh (yukni kamaytirish). */
export const getCachedOlympiadPublicSpotlight = unstable_cache(
  async () => getOlympiadPublicSpotlight(),
  ["olympiad-public-spotlight-v1"],
  { revalidate: 60 },
);
