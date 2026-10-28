import type { CountryContent } from "@/content/load";
import type { Interest } from "@/content/schema";
import type { PlannerData } from "./types";

/** Trims country content down to what the planner needs in the browser. */
export function toPlannerData(content: CountryContent, interests: Interest[]): PlannerData {
  const { country, regions, destinations, legs } = content;
  return {
    country: {
      slug: country.slug,
      name: country.name,
      currency: country.currency,
      gateways: country.gateways.map(({ destination, name, code }) => ({ destination, name, code })),
    },
    interests,
    regions: regions.map(({ id, name, months }) => ({ id, name, months })),
    destinations: destinations.map((d) => ({
      slug: d.slug,
      name: d.name,
      region: d.region,
      coordinates: d.coordinates,
      summary: d.summary,
      interests: d.interests,
      nights: d.nights,
      months: d.months,
      highlights: d.highlights,
      stay: d.stay,
      photo: d.photo,
      social: d.solo.social,
    })),
    legs,
  };
}
