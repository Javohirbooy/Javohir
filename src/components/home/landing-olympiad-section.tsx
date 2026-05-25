import type { ComponentProps } from "react";
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

  let spotlightProps: ComponentProps<typeof OlympiadPublicSpotlight>;
  try {
    spotlightProps = {
      variant: "full",
      upcoming: d.upcoming.map((c) => ({
        ...c,
        startsAt: toIso(c.startsAt),
        endsAt: c.endsAt ? toIso(c.endsAt) : null,
      })),
      active: d.active.map((c) => ({
        ...c,
        startsAt: toIso(c.startsAt),
        endsAt: c.endsAt ? toIso(c.endsAt) : null,
      })),
      winners: d.winners.map((w) => ({
        ...w,
        finalizedAt: w.finalizedAt ? toIso(w.finalizedAt) : null,
      })),
    };
  } catch (err) {
    console.error("[landing-olympiad-section]", err);
    return null;
  }

  return <OlympiadPublicSpotlight {...spotlightProps} />;
}
