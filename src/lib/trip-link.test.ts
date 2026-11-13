import { describe, expect, it } from "vitest";
import { loadCountry, loadInterests } from "@/content/load";
import { toPlannerData } from "@/planner/data";
import { generatePlan, planFromStops, toEditedRoute } from "@/planner/engine";
import type { PlannerInput } from "@/planner/types";
import { decodeTrip, encodeTrip, todayIn, tripStatus } from "./trip-link";

const data = toPlannerData(loadCountry("sri-lanka"), loadInterests());
const input: PlannerInput = {
  days: 14,
  startDate: "2027-02-01",
  interests: ["history", "hiking", "beaches"],
  regions: [],
  pace: "balanced",
  budget: "budget",
  transport: "public",
  meetPeople: true,
  preferTrains: true,
  landingTime: "08:30",
};
const plan = generatePlan(data, input);
const trip = { name: "Steph", sharedOn: "2026-11-13", input, route: toEditedRoute(plan) };

describe("trip links", () => {
  it("round-trips a trip, including names with accents and emoji", () => {
    const named = { ...trip, name: "Zoë 🌴" };
    expect(decodeTrip(`#${encodeTrip(named)}`)).toEqual(named);
  });

  it("rebuilds the same route the traveller shared", () => {
    const shared = decodeTrip(encodeTrip(trip))!;
    const rebuilt = planFromStops(data, shared.input, shared.route);
    expect(rebuilt.stops.map((s) => [s.destination.slug, s.nights])).toEqual(plan.stops.map((s) => [s.destination.slug, s.nights]));
    expect(rebuilt.days).toHaveLength(plan.days.length);
  });

  it("only uses URL-safe characters", () => {
    expect(encodeTrip(trip)).toMatch(/^t=[A-Za-z0-9_-]+$/);
  });

  it("refuses damaged or tampered links", () => {
    const good = encodeTrip(trip);
    expect(decodeTrip("")).toBeNull();
    expect(decodeTrip("#t=")).toBeNull();
    expect(decodeTrip(good.slice(0, 40))).toBeNull();
    expect(decodeTrip("#t=not*base64")).toBeNull();
    const tampered = (patch: object) => {
      const json = JSON.stringify({ v: 1, ...trip, ...patch });
      return `t=${Buffer.from(json).toString("base64url")}`;
    };
    expect(decodeTrip(tampered({}))).not.toBeNull();
    expect(decodeTrip(tampered({ input: { ...input, days: 9999 } }))).toBeNull();
    expect(decodeTrip(tampered({ route: { arrivalNights: 1, stops: [{ slug: "<script>", nights: 2 }] } }))).toBeNull();
    expect(decodeTrip(tampered({ name: "x".repeat(200) }))).toBeNull();
  });
});

describe("where the traveller is today", () => {
  it("counts down before the trip", () => {
    expect(tripStatus(plan.days, "2027-01-29")).toEqual({ kind: "before", daysToGo: 3 });
  });

  it("shows the day's plan during the trip", () => {
    const status = tripStatus(plan.days, "2027-02-01");
    expect(status?.kind).toBe("during");
    expect(status?.kind === "during" && status.day.day).toBe(1);
    const last = tripStatus(plan.days, "2027-02-14");
    expect(last?.kind === "during" && last.day.title).toBe("Fly home");
  });

  it("says when the trip is over", () => {
    expect(tripStatus(plan.days, "2027-02-15")).toEqual({ kind: "after" });
  });

  it("has nothing to say for a trip without dates", () => {
    const undated = generatePlan(data, { ...input, startDate: undefined, month: 1 });
    expect(tripStatus(undated.days, "2027-02-03")).toBeNull();
  });

  it("uses the date in the country being visited", () => {
    // 8pm in London on 1 Feb is already 2 Feb in Sri Lanka.
    expect(todayIn("Asia/Colombo", new Date("2027-02-01T20:00:00Z"))).toBe("2027-02-02");
  });
});
