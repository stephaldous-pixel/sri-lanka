import { describe, expect, it } from "vitest";
import { loadCountry, loadInterests } from "@/content/load";
import { toPlannerData } from "./data";
import { generatePlan, PlannerError } from "./engine";
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

function modeKey(name: string) {
  return name === "tuk tuk" ? "tuk-tuk" : name;
}
