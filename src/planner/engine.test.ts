import { describe, expect, it } from "vitest";
import { loadCountry, loadInterests } from "@/content/load";
import { toPlannerData } from "./data";
import { ARRIVAL, bestPositionFor, fitToDays, fromStopList, generatePlan, planFromStops, PlannerError, toEditedRoute, toStopList } from "./engine";
import type { PlannerInput } from "./types";

const data = toPlannerData(loadCountry("sri-lanka"), loadInterests());
const regionOf = new Map(data.destinations.map((d) => [d.slug, d.region]));

const base: PlannerInput = {
  days: 14,
  startDate: "2027-02-01",
  interests: ["history", "hiking", "beaches"],
  regions: [],
  pace: "balanced",
  budget: "budget",
  transport: "public",
  meetPeople: true,
};

const slugs = (input: Partial<PlannerInput>) => generatePlan(data, { ...base, ...input }).stops.map((s) => s.destination.slug);

describe("generatePlan", () => {
  it.each([
    [3, "packed"],
    [7, "balanced"],
    [10, "relaxed"],
    [14, "balanced"],
    [21, "packed"],
    [30, "relaxed"],
    [45, "balanced"],
  ] as const)("fills exactly %i days (%s pace)", (days, pace) => {
    const plan = generatePlan(data, { ...base, days, pace });
    expect(plan.totalNights).toBe(days - 1);
    expect(plan.days).toHaveLength(days);
    expect(plan.days.map((d) => d.day)).toEqual(Array.from({ length: days }, (_, i) => i + 1));
    for (const stop of plan.stops) expect(stop.nights).toBeGreaterThanOrEqual(1);
  });

  it("starts with an arrival night at the airport town and ends by flying home", () => {
    const plan = generatePlan(data, base);
    expect(plan.stops[0]).toMatchObject({ role: "arrival", arriveDay: 1 });
    expect(plan.stops[0].destination.slug).toBe("negombo");
    expect(plan.days.at(-1)?.title).toBe("Fly home");
    expect(plan.days[0].date).toBe("2027-02-01");
    expect(plan.days.at(-1)?.date).toBe("2027-02-14");
  });

  it("never visits the same place twice, except the airport town at each end", () => {
    const visited = slugs({ days: 30 }).filter((s) => s !== "negombo");
    expect(new Set(visited).size).toBe(visited.length);
  });

  it("keeps to the regions the traveller picked and includes each one", () => {
    const regions = ["hill-country", "east"];
    const plan = generatePlan(data, { ...base, regions, startDate: "2027-07-01", interests: ["surfing", "hiking"] });
    const visitedRegions = plan.stops.filter((s) => s.role === "stop").map((s) => regionOf.get(s.destination.slug));
    for (const region of visitedRegions) expect(regions).toContain(region);
    for (const region of regions) expect(visitedRegions).toContain(region);
  });

  it("follows the seasons: east-coast surf in July, south-coast surf in January", () => {
    const july = slugs({ interests: ["surfing"], startDate: "2027-07-01" });
    const january = slugs({ interests: ["surfing"], startDate: "2027-01-05" });
    expect(july).toContain("arugam-bay");
    expect(january).not.toContain("arugam-bay");
    expect(january.some((s) => ["weligama", "hikkaduwa", "tangalle"].includes(s))).toBe(true);
  });

  it("builds the classic varied loop for history, hiking and beaches in February", () => {
    for (const transport of ["public", "driver"] as const) {
      const route = slugs({ transport });
      expect(route, transport).toContain("ella");
      expect(route.some((s) => ["sigiriya", "dambulla", "polonnaruwa", "anuradhapura", "kandy"].includes(s)), transport).toBe(true);
      expect(route.some((s) => ["unawatuna", "mirissa", "weligama", "tangalle", "hikkaduwa"].includes(s)), transport).toBe(true);
    }
  });

  it("keeps single-interest trips focused", () => {
    const route = slugs({ interests: ["history"], startDate: undefined, month: 4, days: 10 });
    const ancient = route.filter((s) => regionOf.get(s) === "ancient-cities");
    expect(ancient.length).toBeGreaterThanOrEqual(3);
  });

  it("warns when a requested region is out of season", () => {
    const plan = generatePlan(data, { ...base, regions: ["east"], startDate: "2027-12-01", interests: ["beaches"] });
    const east = plan.stops.find((s) => regionOf.get(s.destination.slug) === "east");
    expect(east?.warnings.join(" ")).toMatch(/December/);
  });

  it("never routes travellers onto a suspended train", () => {
    for (const transport of ["public", "mixed", "driver"] as const) {
      const plan = generatePlan(data, { ...base, transport, days: 21, interests: ["hiking", "temples-spirituality", "train-journeys"] });
      for (const hop of plan.hops) {
        for (let i = 0; i < hop.path.length - 1; i++) {
          const [a, b] = [hop.path[i], hop.path[i + 1]];
          const leg = data.legs.find((l) => (l.from === a && l.to === b) || (l.from === b && l.to === a));
          expect(leg, `${a} → ${b} should be a real leg`).toBeDefined();
          const used = leg!.options.find((o) => o.mode === modeKey(hop.modes[i]));
          expect(used?.status, `${a} → ${b} by ${hop.modes[i]}`).not.toBe("suspended");
        }
      }
    }
  });

  it("uses a car with a driver when that's preferred", () => {
    const plan = generatePlan(data, { ...base, transport: "driver" });
    const modes = plan.hops.flatMap((h) => h.modes);
    expect(modes.filter((m) => m === "car").length).toBeGreaterThan(modes.length / 2);
  });

  it("gives the same route for the same answers", () => {
    expect(generatePlan(data, base)).toEqual(generatePlan(data, base));
  });

  it("explains why each place was picked", () => {
    for (const stop of generatePlan(data, base).stops) expect(stop.reasons.length).toBeGreaterThan(0);
  });

  it("estimates costs that grow with the budget level", () => {
    const budget = generatePlan(data, { ...base, budget: "budget" }).estimate.total;
    const comfort = generatePlan(data, { ...base, budget: "comfort" }).estimate.total;
    expect(budget).toBeGreaterThan(0);
    expect(comfort).toBeGreaterThan(budget);
  });

  it("rejects trips that are too short or have no interests", () => {
    expect(() => generatePlan(data, { ...base, days: 1 })).toThrow(PlannerError);
    expect(() => generatePlan(data, { ...base, interests: [] })).toThrow(PlannerError);
  });
});

describe("editing a route", () => {
  const plan = generatePlan(data, base);
  const edits = toEditedRoute(plan);

  it("rebuilds the same plan when nothing changes", () => {
    const rebuilt = planFromStops(data, base, edits);
    expect(rebuilt.stops.map((s) => [s.destination.slug, s.nights, s.arriveDay])).toEqual(
      plan.stops.map((s) => [s.destination.slug, s.nights, s.arriveDay]),
    );
    expect(rebuilt.days).toHaveLength(plan.days.length);
  });

  it("follows the nights the traveller chooses", () => {
    const longer = { ...edits, stops: edits.stops.map((s, i) => (i === 0 ? { ...s, nights: s.nights + 2 } : s)) };
    const rebuilt = planFromStops(data, base, longer);
    expect(rebuilt.days).toHaveLength(plan.days.length + 2);
    expect(rebuilt.totalNights).toBe(rebuilt.days.length - 1);
    expect(rebuilt.days.at(-1)?.date).toBe("2027-02-16");
  });

  it("reorders, removes and adds stops, recalculating journeys", () => {
    const reversed = { ...edits, stops: [...edits.stops].reverse() };
    const rebuilt = planFromStops(data, base, reversed);
    expect(rebuilt.stops.filter((s) => s.role === "stop").map((s) => s.destination.slug)).toEqual(reversed.stops.map((s) => s.slug));
    expect(rebuilt.hops).toHaveLength(rebuilt.stops.length);

    const removed = planFromStops(data, base, { ...edits, stops: edits.stops.slice(1) });
    expect(removed.stops.some((s) => s.destination.slug === edits.stops[0].slug)).toBe(false);

    const added = planFromStops(data, base, { ...edits, stops: [...edits.stops, { slug: "jaffna", nights: 2 }] });
    const jaffna = added.stops.find((s) => s.destination.slug === "jaffna");
    expect(jaffna?.reasons).toEqual(["Added by you"]);
  });

  it("adds a night near the airport when the last stop is far away", () => {
    const farEnd = planFromStops(data, base, { arrivalNights: 1, stops: [{ slug: "arugam-bay", nights: 4 }] });
    expect(farEnd.stops.at(-1)?.role).toBe("departure");
    const nearEnd = planFromStops(data, base, { arrivalNights: 1, stops: [{ slug: "galle", nights: 2 }] });
    expect(nearEnd.stops.at(-1)?.role).toBe("stop");
  });

  it("copes with an empty route and ignores unknown places", () => {
    const empty = planFromStops(data, base, { arrivalNights: 3, stops: [{ slug: "atlantis", nights: 2 }] });
    expect(empty.stops).toHaveLength(1);
    expect(empty.days).toHaveLength(4);
  });

  it("suggests slotting a new place where it adds least travel", () => {
    // Galle → Unawatuna → Ella: Mirissa belongs between Unawatuna and Ella, not at either end.
    const index = bestPositionFor(data, base, ["galle", "unawatuna", "ella"], "mirissa");
    expect(index).toBe(2);
  });
});

describe("keeping the trip length fixed while editing", () => {
  const plan = generatePlan(data, base); // 14 days
  const edits = toEditedRoute(plan);
  const days = (e: ReturnType<typeof toEditedRoute>) => planFromStops(data, base, e).days.length;
  const nightsOf = (e: ReturnType<typeof toEditedRoute>, slug: string) => e.stops.find((s) => s.slug === slug)?.nights;

  it("takes a night from elsewhere when one stop gets more", () => {
    const slug = edits.stops[0].slug;
    const bumped = { ...edits, stops: edits.stops.map((s) => (s.slug === slug ? { ...s, nights: s.nights + 2 } : s)) };
    const fitted = fitToDays(data, base, bumped, slug)!;
    expect(days(fitted)).toBe(14);
    expect(nightsOf(fitted, slug)).toBe(edits.stops[0].nights + 2);
  });

  it("gives nights to other stops when one stop gets fewer or is removed", () => {
    const removed = fitToDays(data, base, { ...edits, stops: edits.stops.slice(1) })!;
    expect(days(removed)).toBe(14);
    const slug = edits.stops.find((s) => s.nights > 1)!.slug;
    const cut = { ...edits, stops: edits.stops.map((s) => (s.slug === slug ? { ...s, nights: 1 } : s)) };
    const fitted = fitToDays(data, base, cut, slug)!;
    expect(days(fitted)).toBe(14);
    expect(nightsOf(fitted, slug)).toBe(1);
  });

  it("makes room for an added place", () => {
    const added = fitToDays(data, base, { ...edits, stops: [...edits.stops, { slug: "kandy", nights: 2 }] }, "kandy")!;
    expect(days(added)).toBe(14);
    expect(nightsOf(added, "kandy")).toBe(2);
  });

  it("allows for a night near the airport when the order changes", () => {
    const farLast = { ...edits, stops: [...edits.stops.filter((s) => s.slug !== "ella"), edits.stops.find((s) => s.slug === "ella")!] };
    const fitted = fitToDays(data, base, farLast)!;
    const rebuilt = planFromStops(data, base, fitted);
    expect(rebuilt.days).toHaveLength(14);
    expect(rebuilt.stops.at(-1)?.role).toBe("departure");
  });

  it("can change the arrival night too", () => {
    const fitted = fitToDays(data, base, { ...edits, arrivalNights: 3 }, ARRIVAL)!;
    expect(fitted.arrivalNights).toBe(3);
    expect(days(fitted)).toBe(14);
  });

  it("refuses when every other stop is already down to one night", () => {
    const tight = { arrivalNights: 1, stops: [{ slug: "galle", nights: 1 }, { slug: "unawatuna", nights: 1 }] };
    const short = { ...base, days: 4 };
    expect(fitToDays(data, short, { ...tight, stops: [{ slug: "galle", nights: 2 }, { slug: "unawatuna", nights: 1 }] }, "galle")).toBeNull();
  });
});

describe("choosing where to spend the first night", () => {
  const plan = generatePlan(data, base);
  const edits = toEditedRoute(plan);

  it("treats the first night as an ordinary stop in the editable list", () => {
    const list = toStopList(data, edits);
    expect(list[0]).toMatchObject({ slug: "negombo", nights: 1 });
    expect(fromStopList(list)).toEqual({ ...edits, arrivalSlug: "negombo" });
    expect(fromStopList([])).toBeNull();
  });

  it("makes the next stop the first night when the first is deleted", () => {
    const list = toStopList(data, edits).slice(1);
    const fitted = fitToDays(data, base, fromStopList(list)!)!;
    const rebuilt = planFromStops(data, base, fitted);
    expect(rebuilt.stops[0].destination.slug).toBe(list[0].slug);
    expect(rebuilt.stops[0].role).toBe("arrival");
    expect(rebuilt.days).toHaveLength(14);
  });

  it("protects the first stop's nights when they're changed", () => {
    const list = toStopList(data, edits);
    list[0] = { ...list[0], nights: 3 };
    const fitted = fitToDays(data, base, fromStopList(list)!, list[0].slug)!;
    expect(fitted.arrivalNights).toBe(3);
    expect(planFromStops(data, base, fitted).days).toHaveLength(14);
  });

  it("lets the airport town appear later in the route", () => {
    const list = [...toStopList(data, edits).slice(1), { slug: "negombo", nights: 1 }];
    const rebuilt = planFromStops(data, base, fitToDays(data, base, fromStopList(list)!)!);
    expect(rebuilt.stops.at(-1)?.destination.slug).toBe("negombo");
    expect(rebuilt.days).toHaveLength(14);
  });

  it("starts the trip in the chosen town and keeps the dates", () => {
    const fitted = fitToDays(data, base, { ...edits, arrivalSlug: "colombo" })!;
    const rebuilt = planFromStops(data, base, fitted);
    expect(rebuilt.stops[0]).toMatchObject({ role: "arrival" });
    expect(rebuilt.stops[0].destination.slug).toBe("colombo");
    expect(rebuilt.stops[0].reasons[0]).toMatch(/Your choice/);
    expect(rebuilt.days[0].title).toMatch(/travel to Colombo/);
    expect(rebuilt.days[0].detail).toMatch(/1 hr/);
    expect(rebuilt.days).toHaveLength(14);
  });

  it("doesn't visit the first-night town twice", () => {
    const withGalle = fitToDays(data, base, { ...edits, arrivalSlug: "galle" })!;
    const rebuilt = planFromStops(data, base, withGalle);
    expect(rebuilt.stops.filter((s) => s.destination.slug === "galle")).toHaveLength(1);
  });
});

describe("starting at the airport", () => {
  it("begins every route with a journey from the airport, not a night there", () => {
    const plan = generatePlan(data, base);
    expect(plan.startHop.from).toBe("airport");
    expect(plan.startHop.to).toBe(plan.stops[0].destination.slug);
    expect(plan.days[0].title).toMatch(/^Arrive at Colombo airport \(CMB\)/);
  });

  it("goes straight from the airport to a far first stop, counting the travel", () => {
    const edits = { arrivalSlug: "galle", arrivalNights: 3, stops: [{ slug: "mirissa", nights: 3 }] };
    const plan = planFromStops(data, base, edits);
    expect(plan.stops[0].destination.slug).toBe("galle");
    expect(plan.startHop.hours).toBeGreaterThan(1.5);
    expect(plan.startHop.modes.length).toBeGreaterThan(0);
    expect(plan.travelHours).toBeGreaterThanOrEqual(plan.startHop.hours + plan.hops[0].hours);
  });

  it("warns about a very long first day", () => {
    const plan = planFromStops(data, base, { arrivalSlug: "jaffna", arrivalNights: 3, stops: [] });
    expect(plan.warnings.join(" ")).toMatch(/Long first day/);
  });
});

describe("preferring trains", () => {
  const trains = { ...base, preferTrains: true };
  const galleFirst = { arrivalSlug: "galle", arrivalNights: 3, stops: [{ slug: "mirissa", nights: 3 }, { slug: "ella", nights: 3 }] };

  it("takes the train where it runs, even if a bus is quicker", () => {
    const usual = planFromStops(data, base, galleFirst);
    const scenic = planFromStops(data, trains, galleFirst);
    expect(usual.startHop.modes).not.toContain("train");
    expect(scenic.startHop.modes).toContain("train");
  });

  it("gets from the airport to the station by taxi", () => {
    const scenic = planFromStops(data, trains, galleFirst);
    expect(scenic.startHop.modes[0]).toBe("taxi");
    expect(scenic.startHop.path).toContain("colombo");
  });

  it("reports real journey times, not the preference weighting", () => {
    const scenic = planFromStops(data, trains, galleFirst);
    // Taxi to Colombo (0.75) + train to Galle (3).
    expect(scenic.startHop.hours).toBeCloseTo(3.75, 1);
  });

  it("still never uses a suspended train", () => {
    const plan = planFromStops(data, trains, { arrivalSlug: "kandy", arrivalNights: 2, stops: [{ slug: "ella", nights: 3 }] });
    for (const hop of [plan.startHop, ...plan.hops]) {
      hop.modes.forEach((mode, i) => {
        if (mode !== "train") return;
        const [a, b] = [hop.path[i], hop.path[i + 1]];
        const leg = data.legs.find((l) => (l.from === a && l.to === b) || (l.from === b && l.to === a));
        expect(leg?.options.find((o) => o.mode === "train")?.status, `${a} → ${b}`).not.toBe("suspended");
      });
    }
  });
});

function modeKey(name: string) {
  return name === "tuk tuk" ? "tuk-tuk" : name;
}
