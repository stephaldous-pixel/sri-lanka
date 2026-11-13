// A trip packed into a link, so travellers can show contacts their route and
// dates without accounts. It lives in the URL's #fragment, which browsers never
// send to the server. Anyone can make such a link, so decoding checks every
// field and refuses anything unexpected.
import { z } from "zod";
import { daysInclusive } from "@/lib/dates";
import type { EditedRoute } from "@/planner/engine";
import type { PlanDay, PlannerInput } from "@/planner/types";

export type SharedTrip = {
  /** How the traveller wants to be named, e.g. "Steph". */
  name?: string;
  /** YYYY-MM-DD the link was made. */
  sharedOn: string;
  input: PlannerInput;
  /** The route exactly as it was when shared, so later changes to the planner don't alter it. */
  route: EditedRoute;
};

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const time = z.string().regex(/^\d{2}:\d{2}$/);
const slug = z.string().regex(/^[a-z0-9-]{1,60}$/);
const nights = z.number().int().min(1).max(60);

const TripSchema = z.object({
  v: z.literal(1),
  name: z.string().trim().min(1).max(40).optional(),
  sharedOn: isoDate,
  input: z.object({
    days: z.number().int().min(2).max(60),
    startDate: isoDate.optional(),
    month: z.number().int().min(0).max(11).optional(),
    interests: z.array(slug).max(30),
    regions: z.array(slug).max(30),
    pace: z.enum(["relaxed", "balanced", "packed"]),
    budget: z.enum(["budget", "mid", "comfort"]),
    transport: z.enum(["public", "mixed", "driver"]),
    meetPeople: z.boolean(),
    preferTrains: z.boolean().optional(),
    landingTime: time.optional(),
    departureTime: time.optional(),
  }),
  route: z.object({
    arrivalSlug: slug.optional(),
    arrivalNights: nights,
    stops: z.array(z.object({ slug, nights, reasons: z.array(z.string().max(200)).max(6).optional() })).max(40),
  }),
});

/** The #fragment for a trip link (without the #). */
export function encodeTrip(trip: SharedTrip): string {
  const bytes = new TextEncoder().encode(JSON.stringify({ v: 1, ...trip }));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return `t=${btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

/** The trip in a link's #fragment, or null if it's missing, damaged or not one of ours. */
export function decodeTrip(fragment: string): SharedTrip | null {
  const match = fragment.replace(/^#/, "").match(/^t=([A-Za-z0-9_-]{1,20000})$/);
  if (!match) return null;
  try {
    const binary = atob(match[1].replace(/-/g, "+").replace(/_/g, "/"));
    const json = new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
    const parsed = TripSchema.safeParse(JSON.parse(json));
    if (!parsed.success) return null;
    const { name, sharedOn, input, route } = parsed.data;
    return { name, sharedOn, input, route };
  } catch {
    return null;
  }
}

export type TripStatus =
  | { kind: "before"; daysToGo: number }
  | { kind: "during"; day: PlanDay }
  | { kind: "after" };

/** Where the trip stands on `today` (YYYY-MM-DD), or null for a trip without dates. */
export function tripStatus(days: PlanDay[], today: string): TripStatus | null {
  const first = days[0]?.date;
  const last = days.at(-1)?.date;
  if (!first || !last) return null;
  if (today < first) return { kind: "before", daysToGo: daysInclusive(today, first) - 1 };
  if (today > last) return { kind: "after" };
  const day = days.find((d) => d.date === today);
  return day ? { kind: "during", day } : null;
}

/** Today's date (YYYY-MM-DD) in a time zone, e.g. the country being visited. */
export function todayIn(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
