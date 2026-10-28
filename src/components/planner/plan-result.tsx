"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Chevron, Disclosure } from "@/components/disclosure";
import { Photo } from "@/components/photo";
import { Price } from "@/components/currency";
import { formatHours } from "@/lib/format";
import { card } from "@/lib/ui";
import type { Hop, PlannedStop, PlannerData, PlannerInput, PlanResult } from "@/planner/types";

const BUDGET_LABELS = { budget: "budget", mid: "mid-range", comfort: "comfort" } as const;

export function PlanResultView({ data, input, plan }: { data: PlannerData; input: PlannerInput; plan: PlanResult }) {
  const { symbol, code } = data.country.currency;
  const money = (amount: number) => <Price amount={amount} code={code} symbol={symbol} />;
  const names = new Map(data.destinations.map((d) => [d.slug, d.name]));
  const places = plan.stops.filter((s) => s.role === "stop").length;
  const stopWarnings = plan.stops.reduce((n, s) => n + s.warnings.length, 0);
  const hopWarnings = [...new Set(plan.hops.flatMap((h) => h.warnings))];
  const notes = plan.warnings.length + stopWarnings + hopWarnings.length;

  return (
    <div className="space-y-8">
      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
        <li>
          <span className="font-semibold text-foreground">{places}</span> places
        </li>
        <li>
          <span className="font-semibold text-foreground">~{Math.round(plan.travelHours)} hr</span> travelling
        </li>
        <li>
          about <span className="font-semibold text-foreground">{money(plan.estimate.total)}</span>
        </li>
      </ul>

      {notes > 0 && (
        <Disclosure
          tone="warning"
          summary={
            <span className="text-warning">
              {notes} thing{notes === 1 ? "" : "s"} to know before you go
            </span>
          }
        >
          <ul className="list-disc space-y-1.5 pl-5 text-sm">
            {[...plan.warnings, ...hopWarnings].map((w) => (
              <li key={w}>{w}</li>
            ))}
            {plan.stops.flatMap((s) =>
              s.warnings.map((w) => (
                <li key={`${s.destination.slug}-${w}`}>
                  <span className="font-medium">{s.destination.name}:</span> {w}
                </li>
              )),
            )}
          </ul>
        </Disclosure>
      )}

      <section aria-label="Your route">
        <ol>
          {plan.stops.map((stop, i) => (
            <li key={`${stop.destination.slug}-${i}`}>
              <StopCard stop={stop} countrySlug={data.country.slug} />
              <HopLine hop={plan.hops[i]} names={names} final={i === plan.stops.length - 1} />
            </li>
          ))}
          <li className="flex items-center gap-3 pl-[1.15rem] text-sm font-medium">
            <span className="flex size-6 items-center justify-center rounded-full bg-foreground text-xs text-background" aria-hidden="true">
              ✈
            </span>
            Fly home · Day {input.days}
          </li>
        </ol>
      </section>

      <div className="space-y-3">
        <Disclosure tone="card" summary={`Day-by-day plan (${plan.days.length} days)`}>
          <ol className="divide-y divide-line text-sm">
            {plan.days.map((d) => (
              <li key={d.day} className="grid grid-cols-[5.5rem_1fr] gap-3 py-3">
                <div className="text-muted">
                  <span className="font-medium text-foreground">Day {d.day}</span>
                  {d.date && <span className="block text-xs">{formatDay(d.date)}</span>}
                </div>
                <div>
                  <p className="font-medium">{d.title}</p>
                  {d.detail && <p className="text-muted">{d.detail}</p>}
                </div>
              </li>
            ))}
          </ol>
        </Disclosure>

        <Disclosure
          tone="card"
          summary={
            <>
              Rough cost: {money(plan.estimate.total)}
              <span className="ml-2 text-sm font-normal text-muted">{BUDGET_LABELS[input.budget]}, one person</span>
            </>
          }
        >
          <dl className="space-y-2 text-sm">
            <Row label="Places to stay" value={money(plan.estimate.stay)} />
            <Row label="Food, local transport & activities" value={money(plan.estimate.daily)} />
          </dl>
          <p className="mt-3 text-xs text-muted">
            A ballpark from typical prices. Excludes flights, visas and big extras like Sigiriya or safaris.
          </p>
        </Disclosure>
      </div>
    </div>
  );
}

function StopCard({ stop, countrySlug }: { stop: PlannedStop; countrySlug: string }) {
  const days = stop.nights <= 1 ? `Day ${stop.arriveDay}` : `Days ${stop.arriveDay}–${stop.arriveDay + stop.nights - 1}`;
  return (
    <details className={`group ${card} overflow-hidden`}>
      <summary className="flex cursor-pointer list-none items-center gap-4 p-3 pr-4 [&::-webkit-details-marker]:hidden">
        <Photo photo={stop.destination.photo} sizes="64px" showCredit={false} className="size-14 shrink-0 rounded-xl sm:size-16" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted">
            {days} · {stop.nights} night{stop.nights === 1 ? "" : "s"}
            {stop.warnings.length > 0 && <span className="ml-1.5 text-warning" title="See details">⚠</span>}
          </p>
          <h3 className="truncate font-semibold">{stop.destination.name}</h3>
        </div>
        <Chevron />
      </summary>
      <div className="space-y-3 border-t border-line px-4 py-4 text-sm">
        <ul className="space-y-1 text-muted">
          {stop.reasons.map((r) => (
            <li key={r}>· {r}</li>
          ))}
        </ul>
        {stop.warnings.map((w) => (
          <p key={w} className="text-warning">
            ⚠ {w}
          </p>
        ))}
        <Link href={`/${countrySlug}/places/${stop.destination.slug}`} className="inline-block font-medium text-accent hover:underline">
          About {stop.destination.name} →
        </Link>
      </div>
    </details>
  );
}

function HopLine({ hop, names, final }: { hop: Hop; names: Map<string, string>; final: boolean }) {
  const via = hop.path.slice(1, -1).map((s) => names.get(s) ?? s);
  const modes = [...new Set(hop.modes)];
  return (
    <div className="ml-[1.9rem] border-l-2 border-dotted border-line py-3 pl-5 text-xs text-muted sm:ml-[2.15rem]">
      {modes.length === 0 ? (
        <span>{final ? "Short transfer to the airport" : "Short transfer"}</span>
      ) : (
        <span title={via.length ? `Via ${via.join(" → ")}` : undefined}>
          <span className="font-medium text-foreground">{formatHours(hop.hours)}</span> by {modes.join(" + ")}
          {final && " to the airport"}
          {via.length > 0 && <span className="hidden sm:inline"> · via {via.join(" → ")}</span>}
        </span>
      )}
      {hop.warnings.length > 0 && (
        <span className="ml-1.5 text-warning" title={hop.warnings.join(" ")}>
          ⚠ {hop.warnings.length === 1 ? "Check before travelling" : `${hop.warnings.length} notes`}
        </span>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function formatDay(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}
