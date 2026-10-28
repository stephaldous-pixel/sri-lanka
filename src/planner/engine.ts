// The route generator: picks destinations that suit the traveller, fits them
// into the time available, and orders them to keep travel short. Pure and
// deterministic, so the same answers always give the same route.
import { buildGraph, type TravelGraph } from "./graph";
import type {
  Budget,
  Pace,
  PlanDay,
  PlannedStop,
  PlannerData,
  PlannerDestination,
  PlannerInput,
  PlanResult,
} from "./types";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SEASON_FACTOR = { great: 1, good: 0.85, mixed: 0.5, poor: 0.15 } as const;
/** Total travel the whole trip can include, in hours per trip day, by pace. */
const TRAVEL_HOURS_PER_DAY: Record<Pace, number> = { relaxed: 1.5, balanced: 2.2, packed: 3 };
/** When comparing places, each extra hour of travel costs this much score. */
const SCORE_PER_TRAVEL_HOUR = 0.025;
/** Journeys between stops longer than this (an overnight bus) are left out unless the traveller asked for that region. */
const MAX_HOP_HOURS = 12;
/** If the last stop is further than this from the airport, spend the final night near it. */
const LAST_NIGHT_NEAR_AIRPORT_HOURS = 4;
/** Rough daily spend on food, local transport and activities, in local currency. */
const DAILY_SPEND: Record<Budget, number> = { budget: 4000, mid: 9000, comfort: 20000 };

export class PlannerError extends Error {}

/** Each time the route already covers an interest well, it counts this much less. Keeps routes varied. */
const VARIETY_DECAY = 0.5;
/** Places whose season factor is below this (all "poor" months) are skipped unless their region was requested. */
const MIN_SEASON = 0.3;
/** Places scoring below this (only a weak match) aren't added as filler. */
const MIN_SCORE = 0.25;

type Match = { id: string; strength: number };
type Scored = {
  destination: PlannerDestination;
  /** Score before variety adjustments; used to rank stops for spare nights. */
  score: number;
  matches: Match[];
  season: number;
  social: number;
  reasons: string[];
  forced: boolean;
};

export function generatePlan(data: PlannerData, input: PlannerInput): PlanResult {
  if (!Number.isInteger(input.days) || input.days < 2) throw new PlannerError("A trip needs at least 2 days.");
  if (input.interests.length === 0) throw new PlannerError("Pick at least one thing you'd like to do.");

  const gatewaySlug = data.country.gateways[0].destination;
  const bySlug = new Map(data.destinations.map((d) => [d.slug, d]));
  const gateway = bySlug.get(gatewaySlug)!;
  const graph = buildGraph(data.legs, data.destinations.map((d) => d.slug), input.transport);
  const months = monthsCovered(input);
  const budgetNights = input.days - 1;

  const candidates = scoreDestinations(data, input, months).filter((c) => c.destination.slug !== gatewaySlug);

  // Grow the route one place at a time. Each round, every remaining place is tried
  // at its cheapest point in the loop, and the best balance of "how well it suits
  // you" against "how much extra travel it adds" wins. Requested regions go first.
  let route: Stop[] = [];
  const fits = (r: Stop[]) => nightsUsed(r, graph, gatewaySlug) <= budgetNights - 1; // -1 for the arrival night
  const travelAllowance = input.days * TRAVEL_HOURS_PER_DAY[input.pace];
  const remaining = new Set(candidates);
  const coverage = new Map<string, number>();
  while (remaining.size > 0) {
    const pool = [...remaining].some((c) => c.forced) ? [...remaining].filter((c) => c.forced) : [...remaining];
    let pick: { candidate: Scored; route: Stop[]; rank: number } | undefined;
    for (const candidate of pool) {
      const { destination, forced } = candidate;
      if (!forced && candidate.score < MIN_SCORE) continue;
      const score = varietyScore(candidate, coverage, input.interests.length);
      const nightOptions = [...new Set([targetNights(destination, input.pace), Math.max(1, destination.nights.min)])];
      for (const nights of nightOptions) {
        const best = bestInsertion(route, { candidate, nights }, graph, gatewaySlug);
        if (!best || !fits(best.route)) continue;
        const overAllowance = travelHours(best.route, graph, gatewaySlug) > travelAllowance;
        if (!forced && (overAllowance || best.longestHop > MAX_HOP_HOURS)) continue;
        const rank = score - SCORE_PER_TRAVEL_HOUR * best.addedHours;
        if (!pick || rank > pick.rank) pick = { candidate, route: best.route, rank };
        break; // Prefer the fuller stay when it fits.
      }
    }
    if (pick) {
      route = pick.route;
      remaining.delete(pick.candidate);
      // A top-rated match covers an interest fully; weaker ones only partly.
      for (const m of pick.candidate.matches) coverage.set(m.id, (coverage.get(m.id) ?? 0) + m.strength / 3);
      continue;
    }
    // Nothing fits. Requested regions still get in by replacing the weakest optional stop.
    const forcedLeft = [...remaining].filter((c) => c.forced);
    if (forcedLeft.length === 0) break;
    for (const candidate of forcedLeft) {
      remaining.delete(candidate);
      const { destination } = candidate;
      // Make room for a region the traveller asked for by dropping the weakest optional stop.
      const optional = route.filter((s) => !s.candidate.forced).sort((a, b) => a.candidate.score - b.candidate.score);
      for (const drop of optional) {
        const trimmed = route.filter((s) => s !== drop);
        const best = bestInsertion(trimmed, { candidate, nights: Math.max(1, destination.nights.min) }, graph, gatewaySlug);
        if (best && fits(best.route)) {
          route = best.route;
          break;
        }
      }
    }
  }

  route = improveOrder(route, graph, gatewaySlug);
  const freeNights = spreadSpareNights(route, budgetNights - 1 - nightsUsed(route, graph, gatewaySlug), input.pace);

  return assemble(data, input, graph, gateway, route, months, freeNights);
}

type Stop = { candidate: Scored; nights: number };

/** A route the traveller has edited: the order and nights they chose. */
export type EditedRoute = {
  /** Where the first night is spent; the airport town if not set. */
  arrivalSlug?: string;
  arrivalNights: number;
  stops: { slug: string; nights: number; reasons?: string[] }[];
};

/** The editable parts of a generated plan. */
export function toEditedRoute(plan: PlanResult): EditedRoute {
  return {
    arrivalSlug: plan.stops[0].destination.slug,
    arrivalNights: plan.stops[0].nights,
    stops: plan.stops.filter((s) => s.role === "stop").map((s) => ({ slug: s.destination.slug, nights: s.nights, reasons: s.reasons })),
  };
}

/**
 * Rebuilds a full plan (journeys, days, warnings, costs) from stops the
 * traveller has arranged. The trip length follows from the nights chosen.
 */
export function planFromStops(data: PlannerData, input: PlannerInput, edits: EditedRoute): PlanResult {
  const gatewaySlug = data.country.gateways[0].destination;
  const bySlug = new Map(data.destinations.map((d) => [d.slug, d]));
  const graph = buildGraph(data.legs, data.destinations.map((d) => d.slug), input.transport);
  const clampNights = (n: number) => Math.min(60, Math.max(1, Math.round(n) || 1));
  const arrival = (edits.arrivalSlug && bySlug.get(edits.arrivalSlug)) || bySlug.get(gatewaySlug)!;
  const route: Stop[] = edits.stops
    .filter((s) => bySlug.has(s.slug) && s.slug !== arrival.slug)
    .map((s) => ({
      candidate: {
        destination: bySlug.get(s.slug)!,
        score: 0,
        matches: [],
        season: 1,
        social: 0,
        reasons: s.reasons?.length ? s.reasons : ["Added by you"],
        forced: false,
      },
      nights: clampNights(s.nights),
    }));
  const arrivalNights = clampNights(edits.arrivalNights);
  const lastNight = route.length === 0 && graph.hours(arrival.slug, gatewaySlug) > LAST_NIGHT_NEAR_AIRPORT_HOURS ? 1 : 0;
  const days = arrivalNights + nightsUsed(route, graph, gatewaySlug) + lastNight + 1;
  const edited = { ...input, days };
  return assemble(data, edited, graph, bySlug.get(gatewaySlug)!, route, monthsCovered(edited), 0, arrivalNights, true, arrival);
}

/** Where in the list a new place adds the least travel (an index to insert at). */
export function bestPositionFor(data: PlannerData, input: PlannerInput, slugs: string[], slug: string): number {
  const gateway = data.country.gateways[0].destination;
  const graph = buildGraph(data.legs, data.destinations.map((d) => d.slug), input.transport);
  const loop = (list: string[]) => {
    const all = [gateway, ...list, gateway];
    return all.slice(1).reduce((sum, s, i) => sum + graph.hours(all[i], s), 0);
  };
  let best = slugs.length;
  let bestHours = Infinity;
  for (let i = 0; i <= slugs.length; i++) {
    const hours = loop([...slugs.slice(0, i), slug, ...slugs.slice(i)]);
    if (hours < bestHours) {
      best = i;
      bestHours = hours;
    }
  }
  return best;
}

/** Marks the arrival night when protecting it from rebalancing. */
export const ARRIVAL = "@arrival";

/**
 * Moves nights between stops so the trip fills exactly `input.days`, keeping
 * the traveller's dates fixed. The stop named in `protect` (a slug, or
 * ARRIVAL) keeps the nights it was just given. Nights are taken first from
 * stops furthest above their ideal stay, and given first to stops furthest
 * below it. Returns null if it can't fit (every other stop is down to 1 night).
 */
export function fitToDays(data: PlannerData, input: PlannerInput, edits: EditedRoute, protect?: string): EditedRoute | null {
  const gateway = data.country.gateways[0].destination;
  const graph = buildGraph(data.legs, data.destinations.map((d) => d.slug), input.transport);
  const ideal = new Map(data.destinations.map((d) => [d.slug, d.nights]));
  const stops = edits.stops.map((s) => ({ ...s, nights: Math.max(1, Math.round(s.nights)) }));
  let arrival = Math.max(1, Math.round(edits.arrivalNights));

  const lastSlug = stops.at(-1)?.slug ?? edits.arrivalSlug;
  const lastNight = lastSlug && lastSlug !== gateway && graph.hours(lastSlug, gateway) > LAST_NIGHT_NEAR_AIRPORT_HOURS ? 1 : 0;
  let diff = input.days - 1 - lastNight - (arrival + stops.reduce((sum, s) => sum + s.nights, 0));

  if (protect && protect === (edits.arrivalSlug ?? gateway)) protect = ARRIVAL;
  const free = stops.filter((s) => s.slug !== protect);
  const target = (s: (typeof stops)[number]) => ideal.get(s.slug)?.ideal ?? 2;
  const max = (s: (typeof stops)[number]) => ideal.get(s.slug)?.max ?? 30;

  while (diff > 0) {
    // Give a night to the stop furthest below its ideal (then with most room before its max).
    const pick = [...free].sort((a, b) => target(b) - b.nights - (target(a) - a.nights) || max(b) - b.nights - (max(a) - a.nights))[0];
    if (pick) pick.nights++;
    else if (protect !== ARRIVAL) arrival++;
    else return null;
    diff--;
  }
  while (diff < 0) {
    // Take a night from the stop furthest above its ideal (then with the most nights).
    const pick = [...free]
      .filter((s) => s.nights > 1)
      .sort((a, b) => b.nights - target(b) - (a.nights - target(a)) || b.nights - a.nights)[0];
    if (pick) pick.nights--;
    else if (protect !== ARRIVAL && arrival > 1) arrival--;
    else return null;
    diff++;
  }
  return { ...edits, arrivalNights: arrival, stops };
}

/** One stop in the editable list. The first one is where the first night is spent. */
export type ListStop = { slug: string; nights: number; reasons?: string[] };

/** The route as one list, first night included, so every stop is edited the same way. */
export function toStopList(data: PlannerData, edits: EditedRoute): ListStop[] {
  return [{ slug: edits.arrivalSlug ?? data.country.gateways[0].destination, nights: edits.arrivalNights }, ...edits.stops];
}

/** Back from a list to an edited route; null if the list is empty (a trip needs one place). */
export function fromStopList(list: ListStop[]): EditedRoute | null {
  if (list.length === 0) return null;
  const [first, ...rest] = list;
  return { arrivalSlug: first.slug, arrivalNights: first.nights, stops: rest };
}

/** Nights we'd suggest for a place at this pace. */
export function suggestedNights(data: PlannerData, input: PlannerInput, slug: string): number {
  const d = data.destinations.find((x) => x.slug === slug);
  return d ? targetNights(d, input.pace) : 1;
}

/** Months the trip touches, with how many days fall in each. */
function monthsCovered(input: PlannerInput): Map<number, number> {
  const counts = new Map<number, number>();
  if (input.startDate) {
    const start = new Date(`${input.startDate}T00:00:00Z`);
    for (let i = 0; i < input.days; i++) {
      const m = new Date(start.getTime() + i * 86_400_000).getUTCMonth();
      counts.set(m, (counts.get(m) ?? 0) + 1);
    }
  } else if (input.month !== undefined) {
    counts.set(input.month, input.days);
  }
  return counts;
}

function monthRatings(data: PlannerData, d: PlannerDestination) {
  return d.months ?? data.regions.find((r) => r.id === d.region)?.months ?? [];
}

function seasonFactor(data: PlannerData, d: PlannerDestination, months: Map<number, number>): number {
  if (months.size === 0) return 1;
  const ratings = monthRatings(data, d);
  let total = 0;
  let days = 0;
  for (const [m, count] of months) {
    total += SEASON_FACTOR[ratings[m] ?? "good"] * count;
    days += count;
  }
  return total / days;
}

function scoreDestinations(data: PlannerData, input: PlannerInput, months: Map<number, number>): Scored[] {
  const interestName = new Map(data.interests.map((i) => [i.id, i.name.toLowerCase()]));
  const inFocus = (d: PlannerDestination) => input.regions.length === 0 || input.regions.includes(d.region);

  const scored = data.destinations.filter(inFocus).map((d) => {
    const matches = input.interests
      .map((id) => ({ id, strength: d.interests[id] ?? 0 }))
      .filter((m) => m.strength > 0)
      .sort((a, b) => b.strength - a.strength);
    const social = input.meetPeople ? (d.social - 2) * 0.12 : 0;
    const season = seasonFactor(data, d, months);
    const candidate: Scored = { destination: d, score: 0, matches, season, social, reasons: [], forced: false };
    candidate.score = matches.length > 0 && season >= MIN_SEASON ? varietyScore(candidate, new Map(), input.interests.length) : 0;

    if (matches.length > 0) candidate.reasons.push(`Good for ${listJoin(matches.slice(0, 3).map((m) => interestName.get(m.id) ?? m.id))}`);
    if (input.meetPeople && d.social === 3) candidate.reasons.push("Easy to meet other travellers");
    if (months.size > 0 && season >= 0.95) candidate.reasons.push(`In season in ${monthList(months)}`);
    return candidate;
  });

  // Guarantee one place in each region the traveller picked: the best one there.
  for (const region of input.regions) {
    const best = scored.filter((s) => s.destination.region === region).sort((a, b) => b.score - a.score)[0];
    if (best) {
      best.forced = true;
      const name = data.regions.find((r) => r.id === region)?.name ?? region;
      best.reasons.unshift(`In ${name}, which you asked for`);
    }
  }

  return scored
    .filter((s) => s.score > 0 || s.forced)
    .sort((a, b) => Number(b.forced) - Number(a.forced) || b.score - a.score || a.destination.slug.localeCompare(b.destination.slug));
}

/**
 * How well a place suits the traveller, given what the route already covers.
 * One top-rated match scores 1; two strong matches score more (capped), so
 * people aren't punished for ticking lots of boxes.
 */
function varietyScore(c: Scored, coverage: Map<string, number>, interestCount: number): number {
  const weighted = c.matches.reduce((sum, m) => sum + m.strength * VARIETY_DECAY ** (coverage.get(m.id) ?? 0), 0);
  const matchScore = Math.min(weighted / (3 * Math.min(interestCount, 2)), 1.2);
  return Math.max(0, matchScore + c.social) * c.season;
}

function targetNights(d: PlannerDestination, pace: Pace): number {
  const { min, ideal, max } = d.nights;
  const nights = pace === "relaxed" ? ideal + 1 : pace === "packed" ? ideal - 1 : ideal;
  return Math.max(1, Math.max(min, Math.min(max, nights)));
}

function nightCap(d: PlannerDestination, pace: Pace): number {
  const { ideal, max } = d.nights;
  return pace === "relaxed" ? max : pace === "balanced" ? Math.min(max, ideal + 1) : ideal;
}

/** Nights the route needs after the arrival night, including a last night near the airport if required. */
function nightsUsed(route: Stop[], graph: TravelGraph, gateway: string): number {
  const nights = route.reduce((sum, s) => sum + s.nights, 0);
  return nights + (needsLastNight(route, graph, gateway) ? 1 : 0);
}

function needsLastNight(route: Stop[], graph: TravelGraph, gateway: string): boolean {
  const last = route.at(-1);
  return !!last && graph.hours(last.candidate.destination.slug, gateway) > LAST_NIGHT_NEAR_AIRPORT_HOURS;
}

/** Total travel for the whole loop: from the airport, through every stop and back. */
function travelHours(route: Stop[], graph: TravelGraph, gateway: string): number {
  const slugs = [gateway, ...route.map((s) => s.candidate.destination.slug), gateway];
  let total = 0;
  for (let i = 0; i < slugs.length - 1; i++) total += graph.hours(slugs[i], slugs[i + 1]);
  return total;
}

/** Longest journey between consecutive stops (the trip home can be broken with a night near the airport). */
function longestHop(route: Stop[], graph: TravelGraph, gateway: string): number {
  const slugs = [gateway, ...route.map((s) => s.candidate.destination.slug)];
  let longest = 0;
  for (let i = 0; i < slugs.length - 1; i++) longest = Math.max(longest, graph.hours(slugs[i], slugs[i + 1]));
  return longest;
}

function bestInsertion(route: Stop[], stop: Stop, graph: TravelGraph, gateway: string) {
  const before = travelHours(route, graph, gateway);
  let best: { route: Stop[]; addedHours: number; longestHop: number } | undefined;
  for (let i = 0; i <= route.length; i++) {
    const next = [...route.slice(0, i), stop, ...route.slice(i)];
    const added = travelHours(next, graph, gateway) - before;
    if (!Number.isFinite(added)) continue;
    if (!best || added < best.addedHours) best = { route: next, addedHours: added, longestHop: longestHop(next, graph, gateway) };
  }
  return best;
}

/** 2-opt: reverse sections of the route while that shortens total travel (without needing more nights). */
function improveOrder(route: Stop[], graph: TravelGraph, gateway: string): Stop[] {
  let best = route;
  let bestHours = travelHours(best, graph, gateway);
  const nightLimit = nightsUsed(route, graph, gateway);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const next = [...best.slice(0, i), ...best.slice(i, j + 1).reverse(), ...best.slice(j + 1)];
        const hours = travelHours(next, graph, gateway);
        if (hours < bestHours - 0.01 && nightsUsed(next, graph, gateway) <= nightLimit) {
          best = next;
          bestHours = hours;
          improved = true;
        }
      }
    }
  }
  return best;
}

/** Hands out unused nights to the best places. Returns nights that couldn't be placed sensibly. */
function spreadSpareNights(route: Stop[], spare: number, pace: Pace): number {
  if (route.length === 0) return spare;
  const byScore = [...route].sort((a, b) => b.candidate.score - a.candidate.score);
  for (const capFor of [(s: Stop) => nightCap(s.candidate.destination, pace), (s: Stop) => s.candidate.destination.nights.max]) {
    let added = true;
    while (spare > 0 && added) {
      added = false;
      for (const stop of byScore) {
        if (spare > 0 && stop.nights < capFor(stop)) {
          stop.nights++;
          spare--;
          added = true;
        }
      }
    }
  }
  // Still spare: give it to the favourite place rather than leaving days unplanned.
  const extra = spare;
  byScore[0].nights += spare;
  return extra;
}

function assemble(
  data: PlannerData,
  input: PlannerInput,
  graph: TravelGraph,
  gateway: PlannerDestination,
  route: Stop[],
  months: Map<number, number>,
  freeNights: number,
  arrivalNights = 1,
  edited = false,
  arrival: PlannerDestination = gateway,
): PlanResult {
  const airport = data.country.gateways[0];
  const lastNight =
    route.length > 0
      ? needsLastNight(route, graph, gateway.slug)
      : arrival.slug !== gateway.slug && graph.hours(arrival.slug, gateway.slug) > LAST_NIGHT_NEAR_AIRPORT_HOURS;
  const stops: PlannedStop[] = [];
  let day = 1;

  // The airport is ~10km from the gateway town, so journeys from it start there (≥ ~25 min).
  const startHop = graph.hop(gateway.slug, arrival.slug);
  startHop.from = "airport";
  startHop.hours = Math.max(0.4, startHop.hours);
  const fromAirport = startHop.hours;
  stops.push({
    destination: arrival,
    nights: arrivalNights,
    arriveDay: day,
    role: "arrival",
    reasons:
      arrival.slug === gateway.slug
        ? [`Close to ${airport.name}, so an easy first night`]
        : [`Your choice for the first night, about ${formatHours(fromAirport)} from ${airport.shortName}`],
    warnings: arrival.slug === gateway.slug ? [] : seasonWarnings(data, arrival, input, day, arrivalNights, months),
  });
  day += arrivalNights;
  for (const { candidate, nights } of route) {
    stops.push({
      destination: candidate.destination,
      nights,
      arriveDay: day,
      role: "stop",
      reasons: candidate.reasons,
      warnings: seasonWarnings(data, candidate.destination, input, day, nights, months),
    });
    day += nights;
  }
  if (lastNight) {
    stops.push({
      destination: gateway,
      nights: 1,
      arriveDay: day,
      role: "departure",
      reasons: ["A night near the airport so you don't miss your flight"],
      warnings: [],
    });
    day += 1;
  }

  // If the route gave the gateway the arrival night only and nothing else fits, the trip is just that.
  const totalNights = stops.reduce((sum, s) => sum + s.nights, 0);
  if (!edited && totalNights < input.days - 1) stops[0].nights += input.days - 1 - totalNights;

  const hops = stops.slice(1).map((s, i) => graph.hop(stops[i].destination.slug, s.destination.slug));
  const finalHop = graph.hop(stops.at(-1)!.destination.slug, gateway.slug);
  hops.push(finalHop);

  const names = new Map(data.destinations.map((d) => [d.slug, d.name]));
  const days = buildDays(input, stops, hops, names, airport, startHop);
  const stay = stops.reduce((sum, s) => sum + s.nights * midpoint(s.destination.stay[input.budget]), 0);
  const daily = DAILY_SPEND[input.budget] * input.days;

  const warnings: string[] = [];
  if (freeNights > 0) {
    warnings.push(
      `You have ${freeNights} more night${freeNights === 1 ? "" : "s"} than these places need. Try adding interests or regions, or enjoy the slow pace.`,
    );
  }
  if (route.length === 0 && !edited) warnings.push("Nothing else fitted your time and choices. Try more days or more interests.");
  for (const hop of hops) {
    if (hop.hours > 6) warnings.push(`Long travel day: ${names.get(hop.from)} to ${names.get(hop.to)} takes about ${Math.round(hop.hours)} hours.`);
  }
  if (startHop.hours > 6) {
    warnings.push(`Long first day: ${airport.shortName} to ${arrival.name} takes about ${Math.round(startHop.hours)} hours after your flight.`);
  }

  return {
    startHop,
    stops,
    hops,
    days,
    totalNights: stops.reduce((sum, s) => sum + s.nights, 0),
    freeNights,
    travelHours: startHop.hours + hops.reduce((sum, h) => sum + h.hours, 0),
    estimate: { stay, daily, total: stay + daily },
    warnings,
  };
}

function seasonWarnings(
  data: PlannerData,
  d: PlannerDestination,
  input: PlannerInput,
  arriveDay: number,
  nights: number,
  tripMonths: Map<number, number>,
): string[] {
  const ratings = monthRatings(data, d);
  let months: number[];
  if (input.startDate) {
    const start = new Date(`${input.startDate}T00:00:00Z`).getTime();
    months = [...new Set(Array.from({ length: nights }, (_, i) => new Date(start + (arriveDay - 1 + i) * 86_400_000).getUTCMonth()))];
  } else {
    months = [...tripMonths.keys()];
  }
  const warnings: string[] = [];
  for (const m of months) {
    if (ratings[m] === "poor") warnings.push(`${MONTHS[m]} is a poor time here: expect heavy rain or closures.`);
    else if (ratings[m] === "mixed") warnings.push(`${MONTHS[m]} weather is mixed here: some rain or rough seas.`);
  }
  return warnings;
}

function buildDays(
  input: PlannerInput,
  stops: PlannedStop[],
  hops: PlanResult["hops"],
  names: Map<string, string>,
  airport: { name: string; shortName: string; code: string },
  startHop: PlanResult["startHop"],
): PlanDay[] {
  const days: PlanDay[] = [];
  const dateFor = (day: number) => {
    if (!input.startDate) return undefined;
    return new Date(new Date(`${input.startDate}T00:00:00Z`).getTime() + (day - 1) * 86_400_000).toISOString().slice(0, 10);
  };
  const travel = (hop: PlanResult["hops"][number]) => {
    if (hop.modes.length === 0) return "A short transfer.";
    const via = hop.path.slice(1, -1).map((s) => names.get(s));
    const modes = [...new Set(hop.modes)];
    return `About ${formatHours(hop.hours)} by ${listJoin(modes)}${via.length ? `, via ${via.join(" → ")}` : ""}.`;
  };

  stops.forEach((stop, i) => {
    const name = stop.destination.name;
    const highlights = stop.destination.highlights.map((h) => h.name);
    for (let n = 0; n < stop.nights; n++) {
      const day = stop.arriveDay + n;
      if (n === 0 && stop.role === "arrival") {
        days.push({
          day,
          date: dateFor(day),
          stop: stop.destination.slug,
          title: `Arrive at ${airport.shortName} (${airport.code}) and travel to ${name}`,
          detail: startHop.modes.length === 0 ? `A short transfer of about ${formatHours(startHop.hours)}.` : travel(startHop),
        });
      } else if (n === 0) {
        days.push({ day, date: dateFor(day), stop: stop.destination.slug, title: `Travel to ${name}`, detail: travel(hops[i - 1]) });
      } else {
        const pick = highlights[(n - 1) % Math.max(highlights.length, 1)];
        days.push({ day, date: dateFor(day), stop: stop.destination.slug, title: `Explore ${name}`, detail: pick ? `Idea: ${pick}.` : undefined });
      }
    }
  });
  const lastDay = stops.at(-1)!.arriveDay + stops.at(-1)!.nights;
  const finalHop = hops.at(-1)!;
  days.push({
    day: lastDay,
    date: dateFor(lastDay),
    stop: stops[0].destination.slug,
    title: "Fly home",
    detail:
      finalHop.modes.length === 0
        ? `A short transfer to ${airport.name}.`
        : `${travel(finalHop).replace(/\.$/, "")} to ${airport.name}. Leave plenty of time.`,
  });
  return days;
}

function midpoint([min, max]: [number, number]) {
  return (min + max) / 2;
}

function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function monthList(months: Map<number, number>): string {
  return listJoin([...months.keys()].map((m) => MONTHS[m]));
}

function formatHours(hours: number): string {
  if (hours < 0.05) return "a few minutes";
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  if (whole === 0) return `${minutes} min`;
  return minutes === 0 ? `${whole} hr` : `${whole} hr ${minutes} min`;
}
