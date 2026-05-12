import { getCachedOlympiadPublicSpotlight } from "@/lib/olympiad/spotlight";
import { OlympiadPublicSpotlight } from "@/components/olympiad/olympiad-public-spotlight";

function toIso(d: Date) {
  return d.toISOString();
}

export async function LandingOlympiadSection() {
  let d: Awaited<ReturnType<typeof getCachedOlympiadPublicSpotlight>> | null = null;
  try {
    d = await getCachedOlympiadPublicSpotlight();
  } catch {
    return null;
  }
  return (
    <OlympiadPublicSpotlight
      variant="full"
      upcoming={d.upcoming.map((c) => ({
        ...c,
        startsAt: toIso(c.startsAt),
        endsAt: c.endsAt ? toIso(c.endsAt) : null,
      }))}
      active={d.active.map((c) => ({
        ...c,
        startsAt: toIso(c.startsAt),
        endsAt: c.endsAt ? toIso(c.endsAt) : null,
      }))}
      winners={d.winners.map((w) => ({
        ...w,
        finalizedAt: w.finalizedAt ? toIso(w.finalizedAt) : null,
      }))}
    />
  );
}
