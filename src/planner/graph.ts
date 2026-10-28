// Travel times between any two destinations, found by chaining direct legs.
import type { TravelLeg } from "@/content/schema";
import type { Hop, TransportPreference } from "./types";

type Option = TravelLeg["options"][number];

type Edge = { to: string; hours: number; option: Option; outsidePreference: boolean };

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

/** Best way to travel one leg given the traveller's preference, or null if nothing runs. */
export function pickOption(options: Option[], preference: TransportPreference) {
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
  const cost = (o: Option) => o.hours + (o.status === "disrupted" ? DISRUPTION_PENALTY_HOURS : 0);
  const option = pool.reduce((best, o) => (cost(o) < cost(best) ? o : best));
  return { option, outsidePreference: preferred.length === 0 };
}

export type TravelGraph = {
  hours(from: string, to: string): number;
  hop(from: string, to: string): Hop;
};

export function buildGraph(legs: TravelLeg[], places: string[], preference: TransportPreference): TravelGraph {
  const edges = new Map<string, Edge[]>(places.map((p) => [p, []]));
  for (const leg of legs) {
    const picked = pickOption(leg.options, preference);
    if (!picked) continue;
    const { option, outsidePreference } = picked;
    edges.get(leg.from)?.push({ to: leg.to, hours: option.hours, option, outsidePreference });
    edges.get(leg.to)?.push({ to: leg.from, hours: option.hours, option, outsidePreference });
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
        const next = dist.get(current)! + edge.hours;
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
      return from === to ? 0 : (shortest.get(from)?.dist.get(to) ?? Infinity);
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
