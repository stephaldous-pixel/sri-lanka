// What pages use to read content. Files are read once per server process.
import { listCountrySlugs, loadCountry, loadInterests, type CountryContent } from "./load";
import type { Destination, Interest, Region, TravelLeg } from "./schema";

const countries = new Map<string, CountryContent>();
let interests: Interest[] | undefined;

export function getInterests(): Interest[] {
  interests ??= loadInterests();
  return interests;
}

export function getInterest(id: string): Interest | undefined {
  return getInterests().find((i) => i.id === id);
}

export function getCountrySlugs(): string[] {
  return listCountrySlugs();
}

export function getCountry(slug: string): CountryContent | undefined {
  if (!getCountrySlugs().includes(slug)) return undefined;
  if (!countries.has(slug)) countries.set(slug, loadCountry(slug));
  return countries.get(slug);
}

export function getRegion(content: CountryContent, id: string): Region | undefined {
  return content.regions.find((r) => r.id === id);
}

export function getDestination(content: CountryContent, slug: string): Destination | undefined {
  return content.destinations.find((d) => d.slug === slug);
}

export function destinationsInRegion(content: CountryContent, regionId: string): Destination[] {
  return content.destinations.filter((d) => d.region === regionId);
}

/** Month ratings for a destination, falling back to its region's. */
export function monthsFor(content: CountryContent, destination: Destination) {
  const region = getRegion(content, destination.region);
  return {
    months: destination.months ?? region?.months ?? [],
    note: destination.monthsNote ?? region?.monthsNote,
  };
}

export type Connection = { destination: Destination; leg: TravelLeg };

/** Places reachable directly from a destination, quickest first. */
export function connectionsFrom(content: CountryContent, slug: string): Connection[] {
  const fastest = (leg: TravelLeg) =>
    Math.min(...leg.options.filter((o) => o.status !== "suspended").map((o) => o.hours));
  return content.legs
    .filter((leg) => leg.from === slug || leg.to === slug)
    .map((leg) => ({ leg, destination: getDestination(content, leg.from === slug ? leg.to : leg.from)! }))
    .sort((a, b) => fastest(a.leg) - fastest(b.leg));
}
