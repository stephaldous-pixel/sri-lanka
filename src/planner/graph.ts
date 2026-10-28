// Travel times between any two destinations, found by chaining direct legs.
import type { TravelLeg } from "@/content/schema";
import type { Hop, TransportPreference } from "./types";

type Option = TravelLeg["options"][number];

/** `hours` is the real journey time; `weight` is what route-finding minimises (preferences applied). */
type Edge = { to: string; hours: number; weight: number; option: Option; outsidePreference: boolean };

const PUBLIC_MODES = new Set(["train", "bus", "tuk-tuk", "ferry"]);
const DRIVER_MODES = new Set(["car", "ferry"]);
/** Disrupted services are usable but less reliable, so prefer alternatives slightly. */
const DISRUPTION_PENALTY_HOURS = 0.75;

const MODE_NAMES: Record<string, string> = {
  train: "train",
  bus: "bus",
  car: "car",
  "tuk-tuk": "tuk tuk",
  ferry: "ferry",
  flight: "flight",
};

/**
 * When a traveller prefers trains, a running train counts as this fraction of its
 * real time, so a scenic train wins over a somewhat quicker bus or car.
 */
const TRAIN_PREFERENCE = 0.6;

/** Best way to travel one leg given the traveller's preferences, or null if nothing runs. */
export function pickOption(options: Option[], preference: TransportPreference, preferTrains = false) {
  const running = options.filter((o) => o.status !== "suspended");
  if (running.length === 0) return null;
  const preferred = running.filter((o) =>
    preference === "public"
      ? PUBLIC_MODES.has(o.mode)
      : preference === "driver"
        ? DRIVER_MODES.has(o.mode) || (o.mode === "tuk-tuk" && o.hours <= 1)
        : true,
  );
  const pool = preferred.length > 0 ? preferred : running;
  // Trains are always allowed when preferred, even for travellers who'd otherwise take a car.
  const candidates = preferTrains ? [...new Set([...pool, ...running.filter((o) => o.mode === "train")])] : pool;
  const option = candidates.reduce((best, o) => (optionWeight(o, preferTrains) < optionWeight(best, preferTrains) ? o : best));
  return { option, outsidePreference: preferred.length === 0 && option.mode !== "train", weight: optionWeight(option, preferTrains) };
}

function optionWeight(o: Option, preferTrains: boolean): number {
  const base = o.hours + (o.status === "disrupted" ? DISRUPTION_PENALTY_HOURS : 0);
  return preferTrains && o.mode === "train" && o.status === "running" ? base * TRAIN_PREFERENCE : base;
}

export type TravelGraph = {
  hours(from: string, to: string): number;
  hop(from: string, to: string): Hop;
};

export function buildGraph(legs: TravelLeg[], places: string[], preference: TransportPreference, preferTrains = false): TravelGraph {
  const edges = new Map<string, Edge[]>(places.map((p) => [p, []]));
  for (const leg of legs) {
    const picked = pickOption(leg.options, preference, preferTrains);
    if (!picked) continue;
    const { option, outsidePreference, weight } = picked;
    edges.get(leg.from)?.push({ to: leg.to, hours: option.hours, weight, option, outsidePreference });
    edges.get(leg.to)?.push({ to: leg.from, hours: option.hours, weight, option, outsidePreference });
  }

  // Dijkstra from every place; small graphs, so a simple scan is plenty fast.
  const shortest = new Map<string, { dist: Map<string, number>; prev: Map<string, { from: string; edge: Edge }> }>();
  for (const source of places) {
    const dist = new Map<string, number>([[source, 0]]);
    const prev = new Map<string, { from: string; edge: Edge }>();
    const done = new Set<string>();
    while (true) {
      let current: string | undefined;
      for (const [node, d] of dist) {
        if (!done.has(node) && (current === undefined || d < dist.get(current)!)) current = node;
      }
      if (current === undefined) break;
      done.add(current);
      for (const edge of edges.get(current) ?? []) {
        const next = dist.get(current)! + edge.weight;
        if (next < (dist.get(edge.to) ?? Infinity)) {
          dist.set(edge.to, next);
          prev.set(edge.to, { from: current, edge });
        }
      }
    }
    shortest.set(source, { dist, prev });
  }

  return {
    hours(from, to) {
      if (from === to) return 0;
      const found = shortest.get(from);
      if (!found?.dist.has(to)) return Infinity;
      let total = 0;
      for (let node = to; node !== from; ) {
        const step = found.prev.get(node)!;
        total += step.edge.hours;
        node = step.from;
      }
      return total;
    },
    hop(from, to) {
      const path = [to];
      const steps: Edge[] = [];
      const { prev } = shortest.get(from)!;
      let node = to;
      while (node !== from) {
        const step = prev.get(node);
        if (!step) break;
        steps.unshift(step.edge);
        path.unshift(step.from);
        node = step.from;
      }
      const warnings: string[] = [];
      for (const edge of steps) {
        if (edge.option.status === "disrupted") {
          warnings.push(`The ${MODE_NAMES[edge.option.mode]} on this route is disrupted. ${edge.option.note ?? "Check before travelling."}`);
        }
        if (edge.outsidePreference) {
          warnings.push(`No ${MODE_NAMES[edge.option.mode] === "car" ? "public transport" : "car"} option for part of this journey, so we've used the ${MODE_NAMES[edge.option.mode]}.`);
        }
      }
      return {
        from,
        to,
        hours: this.hours(from, to),
        path,
        modes: steps.map((e) => MODE_NAMES[e.option.mode]),
        warnings,
      };
    },
  };
}
