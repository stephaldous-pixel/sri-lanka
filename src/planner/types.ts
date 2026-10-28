import type { Destination, Interest, Region, TravelLeg } from "@/content/schema";

export type Pace = "relaxed" | "balanced" | "packed";
export type Budget = "budget" | "mid" | "comfort";
export type TransportPreference = "public" | "mixed" | "driver";

/** What the traveller tells the planner. */
export type PlannerInput = {
  /** Total days including arrival and departure days. */
  days: number;
  /** YYYY-MM-DD. When missing, `month` is used for season checks. */
  startDate?: string;
  /** 0 = January. Used when there's no start date. */
  month?: number;
  interests: string[];
  /** Regions to focus on. Empty means anywhere. */
  regions: string[];
  pace: Pace;
  budget: Budget;
  transport: TransportPreference;
  meetPeople: boolean;
  /** Choose trains where they run, even when a bus or car is a little quicker. */
  preferTrains?: boolean;
};

/** The slice of country content the planner needs. Small enough to send to the browser. */
export type PlannerData = {
  country: {
    slug: string;
    name: string;
    currency: { code: string; symbol: string };
    gateways: { destination: string; name: string; shortName: string; code: string; coordinates: { lat: number; lng: number } }[];
  };
  interests: Interest[];
  regions: Pick<Region, "id" | "name" | "months">[];
  destinations: (Pick<
    Destination,
    "slug" | "name" | "region" | "summary" | "interests" | "nights" | "months" | "highlights" | "stay" | "photo" | "coordinates"
  > & { social: 1 | 2 | 3 })[];
  legs: TravelLeg[];
};

export type PlannerDestination = PlannerData["destinations"][number];

/** One journey between two stops, possibly via other places. */
export type Hop = {
  from: string;
  to: string;
  hours: number;
  /** Destinations passed through, including both ends. */
  path: string[];
  /** Mode used for each step of the path. */
  modes: string[];
  warnings: string[];
};

export type PlannedStop = {
  destination: PlannerDestination;
  nights: number;
  /** 1-based day the traveller arrives. */
  arriveDay: number;
  role: "arrival" | "stop" | "departure";
  reasons: string[];
  warnings: string[];
};

export type PlanDay = {
  day: number;
  date?: string;
  title: string;
  detail?: string;
  stop: string;
};

export type PlanResult = {
  /** The journey from the arrival airport to the first stop (not an overnight stay). */
  startHop: Hop;
  stops: PlannedStop[];
  /** hops[i] connects stops[i] → stops[i + 1]; the last hop goes to the departure airport. */
  hops: Hop[];
  days: PlanDay[];
  totalNights: number;
  freeNights: number;
  travelHours: number;
  estimate: { stay: number; daily: number; total: number };
  warnings: string[];
};
