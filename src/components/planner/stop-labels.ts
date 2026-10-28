import type { PlanResult } from "@/planner/types";

/**
 * The number shown for each stop, shared by the route list and the map so the
 * two always match. Places are numbered from 1 in the order first visited; a
 * place visited again (like a last night near the airport) keeps its number.
 */
export function stopLabels(plan: PlanResult): string[] {
  const seen = new Map<string, string>();
  return plan.stops.map((stop) => {
    const slug = stop.destination.slug;
    if (!seen.has(slug)) seen.set(slug, String(seen.size + 1));
    return seen.get(slug)!;
  });
}
