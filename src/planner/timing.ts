// Clock-time advice for travel days: when to leave so you arrive before dark,
// and how flight times shape the first and last days. Times are hours after
// midnight (8.5 = 8:30am); values of 24 or more fall on the next day.
import type { HopTimes } from "./types";

/** Aim to arrive by this time: it's dark soon after 6pm all year near the equator. */
export const ARRIVE_BY = 17.5;
/** It's dark after this. */
export const DARK = 18.25;
/** Earliest sensible start on an ordinary travel day. */
const EARLIEST_START = 7;
/** Start no later than this on short journeys, leaving the afternoon to explore. */
const LATEST_START = 10;
/** Slack for breaks, waits and traffic on a journey. */
const BUFFER = 0.5;
/** Immigration, bags, a SIM card and cash after landing. */
export const CLEAR_AIRPORT_HOURS = 1.5;
/** Be at the airport this long before an international flight. */
export const CHECK_IN_HOURS = 3;
/** Earliest start on the day you fly home before we'd rather add a night near the airport. */
const EARLIEST_DEPARTURE_START = 5;
/** Without a flight time, a last stop further than this from the airport gets a night near it first. */
const DEFAULT_LAST_DAY_HOURS = 4;
/** Even with a late flight, don't spend more than this travelling on the last day. */
const MAX_LAST_DAY_HOURS = 6;

/** "08:30" → 8.5. Undefined if missing or malformed. */
export function parseTime(time: string | undefined): number | undefined {
  const match = time?.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return undefined;
  return hours + minutes / 60;
}

/** 8.5 → "8:30am", 13 → "1pm", 24.25 → "12:15am". */
export function formatClock(time: number): string {
  const total = Math.round((((time % 24) + 24) % 24) * 60) % (24 * 60);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  const suffix = hours < 12 ? "am" : "pm";
  return minutes === 0 ? `${h12}${suffix}` : `${h12}:${String(minutes).padStart(2, "0")}${suffix}`;
}

const floorHalf = (t: number) => Math.floor(t * 2) / 2;
const ceilQuarter = (t: number) => Math.ceil(t * 4) / 4;
/** Journey times are estimates, so arrivals are given to the nearest quarter hour. */
const roundQuarter = (t: number) => Math.round(t * 4) / 4;

/**
 * A comfortable time to set off on an ordinary travel day: early enough to
 * arrive before dark, but not needlessly early on a short hop.
 */
export function travelDayTimes(hours: number): { leave: number; arrive: number } {
  const leave = Math.max(EARLIEST_START, Math.min(LATEST_START, floorHalf(ARRIVE_BY - hours - BUFFER)));
  return { leave, arrive: roundQuarter(leave + hours) };
}

/** Leaving the airport after landing, and arriving at the first stop. */
export function firstDayTimes(landing: number, hours: number): { leave: number; arrive: number } {
  const leave = ceilQuarter(landing + CLEAR_AIRPORT_HOURS);
  return { leave, arrive: roundQuarter(leave + hours) };
}

/**
 * The latest time to leave for the airport. Flights just after midnight mean
 * travelling the evening before (`eveningBefore`, with times on that evening).
 */
export function departureDayTimes(flight: number, hours: number): { leave: number; arrive: number; eveningBefore: boolean } {
  let airportBy = flight - CHECK_IN_HOURS;
  const eveningBefore = airportBy < 0;
  if (eveningBefore) airportBy += 24;
  return { leave: floorHalf(airportBy - hours - BUFFER), arrive: airportBy, eveningBefore };
}

/**
 * The most travel the last day can take before it's better to spend the night
 * before near the airport. A late flight allows a longer last journey; an
 * early one needs you close by.
 */
export function lastDayTravelLimit(departureTime: string | undefined): number {
  const flight = parseTime(departureTime);
  if (flight === undefined) return DEFAULT_LAST_DAY_HOURS;
  const { arrive: airportBy } = departureDayTimes(flight, 0);
  return Math.max(0, Math.min(MAX_LAST_DAY_HOURS, airportBy - BUFFER - EARLIEST_DEPARTURE_START));
}

/** "Leave Galle around 10am to arrive about 1pm." for the day-by-day plan. */
export function timesSentence(times: HopTimes, destination: string): string {
  const { leave, arrive, kind, fromName, eveningBefore } = times;
  if (kind === "by") {
    const when = eveningBefore ? "the evening before, " : "";
    return `Leave ${fromName} ${when}by ${formatClock(leave)} to reach the airport by ${formatClock(arrive)}, ${CHECK_IN_HOURS} hours before your flight.`;
  }
  return `Leave ${fromName} around ${formatClock(leave)} to reach ${destination} about ${formatClock(arrive)}.`;
}
