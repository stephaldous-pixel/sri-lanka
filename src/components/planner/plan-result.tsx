"use client";

import Link from "next/link";
import { Photo } from "@/components/photo";
import { formatHours, formatPrice } from "@/lib/format";
import type { Hop, PlannerData, PlannerInput, PlanResult } from "@/planner/types";

const BUDGET_LABELS = { budget: "budget", mid: "mid-range", comfort: "comfort" } as const;

export function PlanResultView({ data, input, plan }: { data: PlannerData; input: PlannerInput; plan: PlanResult }) {
  const { symbol } = data.country.currency;
  const names = new Map(data.destinations.map((d) => [d.slug, d.name]));
  const places = plan.stops.filter((s) => s.role === "stop").length;

  return (
    <div className="space-y-10">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Days" value={String(input.days)} />
        <Stat label="Places" value={String(places)} />
        <Stat label="Time travelling" value={`~${Math.round(plan.travelHours)} hr`} />
        <Stat label="Rough cost" value={formatPrice(plan.estimate.total, symbol)} />
      </dl>

      {plan.warnings.length > 0 && (
        <section aria-labelledby="heads-up" className="rounded-xl border border-warning/40 bg-warning-bg p-4 text-sm">
          <h2 id="heads-up" className="font-semibold text-warning">Heads up</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {plan.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="route-heading">
        <h2 id="route-heading" className="text-2xl font-semibold tracking-tight">Your route</h2>
        <ol className="mt-5">
          {plan.stops.map((stop, i) => (
            <li key={`${stop.destination.slug}-${i}`}>
              <article className="flex gap-4 rounded-xl border border-line bg-surface p-4">
                <Photo
                  photo={stop.destination.photo}
                  sizes="96px"
                  showCredit={false}
                  className="hidden size-24 shrink-0 rounded-lg sm:block"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-accent">
                    {dayRange(stop.arriveDay, stop.nights)} · {stop.nights} night{stop.nights === 1 ? "" : "s"}
                  </p>
                  <h3 className="mt-0.5 text-lg font-semibold">
                    <Link href={`/${data.country.slug}/places/${stop.destination.slug}`} className="hover:text-accent hover:underline">
                      {stop.destination.name}
                    </Link>
                  </h3>
                  <ul className="mt-1 space-y-0.5 text-sm text-muted">
                    {stop.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                  {stop.warnings.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-sm text-warning">
                      {stop.warnings.map((w) => (
                        <li key={w}>⚠ {w}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
              <HopLine hop={plan.hops[i]} names={names} final={i === plan.stops.length - 1} />
            </li>
          ))}
        </ol>
        <p className="mt-1 pl-4 text-sm font-medium">✈ Fly home</p>
      </section>

      <section aria-labelledby="days-heading">
        <h2 id="days-heading" className="text-2xl font-semibold tracking-tight">Day by day</h2>
        <ol className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
          {plan.days.map((d) => (
            <li key={d.day} className="grid gap-1 p-4 sm:grid-cols-[9rem_1fr] sm:gap-4">
              <div className="text-sm text-muted">
                <span className="font-medium text-foreground">Day {d.day}</span>
                {d.date && <span className="block">{formatDay(d.date)}</span>}
              </div>
              <div>
                <p className="font-medium">{d.title}</p>
                {d.detail && <p className="text-sm text-muted">{d.detail}</p>}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="cost-heading" className="rounded-xl border border-line bg-surface p-5">
        <h2 id="cost-heading" className="font-semibold">Rough cost for one person ({BUDGET_LABELS[input.budget]})</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <Row label="Places to stay" value={formatPrice(plan.estimate.stay, symbol)} />
          <Row label="Food, local transport & activities" value={formatPrice(plan.estimate.daily, symbol)} />
          <Row label="Total" value={formatPrice(plan.estimate.total, symbol)} strong />
        </dl>
        <p className="mt-3 text-xs text-muted">
          A ballpark from typical prices, not including flights, visas or big extras like Sigiriya or safaris
          (see each place&apos;s highlights). Currency conversion is coming soon.
        </p>
      </section>
    </div>
  );
}

function HopLine({ hop, names, final }: { hop: Hop; names: Map<string, string>; final: boolean }) {
  const via = hop.path.slice(1, -1).map((s) => names.get(s) ?? s);
  const modes = [...new Set(hop.modes)];
  return (
    <div className="ml-8 border-l-2 border-dashed border-line py-3 pl-6 text-sm">
      {modes.length === 0 ? (
        <p className="text-muted">{final ? "Short transfer to the airport" : "Short transfer"}</p>
      ) : (
        <p className="text-muted">
          <span className="font-medium text-foreground">{formatHours(hop.hours)}</span> by {modes.join(" + ")}
          {via.length > 0 && <> via {via.join(" → ")}</>}
          {final && " to the airport"}
        </p>
      )}
      {hop.warnings.map((w) => (
        <p key={w} className="mt-1 text-warning">
          ⚠ {w}
        </p>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-lg font-semibold">{value}</dd>
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "border-t border-line pt-2 font-semibold" : ""}`}>
      <dt className={strong ? "" : "text-muted"}>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function dayRange(arrive: number, nights: number) {
  return nights <= 1 ? `Day ${arrive}` : `Days ${arrive}–${arrive + nights - 1}`;
}

function formatDay(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}
