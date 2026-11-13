"use client";

import { useEffect, useState } from "react";
import { addDays, formatRange, formatShort } from "@/lib/dates";
import { card } from "@/lib/ui";
import { decodeTrip, todayIn, tripStatus, type SharedTrip } from "@/lib/trip-link";
import { planFromStops } from "@/planner/engine";
import type { PlannerData, PlanResult } from "@/planner/types";
import { PlanResultView } from "./plan-result";

type State = { view: "loading" } | { view: "invalid" } | { view: "trip"; trip: SharedTrip; plan: PlanResult; today: string };

/** A trip someone shared by link: their route and dates, read-only, with where they should be today. */
export function SharedTripView({ data }: { data: PlannerData }) {
  const [state, setState] = useState<State>({ view: "loading" });

  useEffect(() => {
    const read = () => {
      const trip = decodeTrip(window.location.hash);
      if (!trip) return setState({ view: "invalid" });
      try {
        const plan = planFromStops(data, trip.input, trip.route);
        setState({ view: "trip", trip, plan, today: todayIn(data.country.timezone) });
      } catch {
        setState({ view: "invalid" });
      }
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [data]);

  if (state.view === "loading") {
    return <div className="mt-8 h-96 animate-pulse rounded-2xl bg-surface-sunken" aria-label="Loading" />;
  }
  if (state.view === "invalid") {
    return (
      <div className={`${card} mt-8 p-6`}>
        <h1 className="text-2xl font-semibold tracking-tight">This trip link doesn&apos;t work</h1>
        <p className="mt-2 text-muted">It may have been cut short when it was copied. Ask the traveller to send it again.</p>
      </div>
    );
  }

  const { trip, plan, today } = state;
  const who = trip.name ?? "The traveller";
  const start = trip.input.startDate;
  const dates = start ? formatRange(start, addDays(start, plan.days.length - 1)) : undefined;
  const status = tripStatus(plan.days, today);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {trip.name ? `${trip.name}’s` : "A"} trip to {data.country.name}
        </h1>
        <p className="mt-2 text-muted">
          {dates ? `${dates} · ` : ""}
          {plan.days.length} days · shared on {formatShort(trip.sharedOn)}. Plans change on the road, so check in with {trip.name ?? "them"} too.
        </p>
      </div>

      {status && (
        <div className={`${card} border-l-4 border-accent p-5`}>
          {status.kind === "before" && (
            <p>
              <span className="font-semibold">Not started yet.</span> {who} lands in {data.country.name}{" "}
              {status.daysToGo === 1 ? "tomorrow" : `in ${status.daysToGo} days`}.
            </p>
          )}
          {status.kind === "during" && (
            <>
              <p className="text-sm text-muted">
                Today in {data.country.name} · {formatShort(today)} · Day {status.day.day} of {plan.days.length}
              </p>
              <p className="mt-1 text-lg font-semibold">{status.day.title}</p>
              {status.day.detail && <p className="mt-1 text-sm text-muted">{status.day.detail}</p>}
              <p className="mt-3 text-xs text-muted">This is the plan, not a live location. For live location, ask {trip.name ?? "them"} to share it from their phone.</p>
            </>
          )}
          {status.kind === "after" && (
            <p>
              <span className="font-semibold">This trip has finished.</span> {who} should be home.
            </p>
          )}
        </div>
      )}

      <PlanResultView data={data} input={trip.input} plan={plan} />
    </div>
  );
}
