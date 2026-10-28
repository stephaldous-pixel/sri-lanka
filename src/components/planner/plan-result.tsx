"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { Chevron, Disclosure } from "@/components/disclosure";
import { Photo } from "@/components/photo";
import { Price } from "@/components/currency";
import { formatHours } from "@/lib/format";
import { button, card } from "@/lib/ui";
import type { Hop, PlannedStop, PlannerData, PlannerInput, PlanResult } from "@/planner/types";
import { FirstNightPicker, NightsStepper } from "./controls";
import { RouteMap } from "./route-map";

const BUDGET_LABELS = { budget: "budget", mid: "mid-range", comfort: "comfort" } as const;

export function PlanResultView({
  data,
  input,
  plan,
  editor,
  onEdit,
  onNights,
  firstNight,
  notice,
  edited = false,
}: {
  data: PlannerData;
  input: PlannerInput;
  plan: PlanResult;
  /** Shown in place of the route list while editing. */
  editor?: ReactNode;
  onEdit?: () => void;
  /** Change the nights at stop `index` (in plan.stops) without opening the editor. */
  onNights?: (index: number, nights: number) => void;
  /** Choose where the first night is spent. */
  firstNight?: { options: { slug: string; name: string; hours: number }[]; onChange: (slug: string) => void };
  /** Feedback after a quick change, announced to screen readers. */
  notice?: string | null;
  edited?: boolean;
}) {
  const { symbol, code } = data.country.currency;
  const money = (amount: number) => <Price amount={amount} code={code} symbol={symbol} />;
  const names = new Map(data.destinations.map((d) => [d.slug, d.name]));
  const places = plan.stops.filter((s) => s.role === "stop").length;
  const stopWarnings = plan.stops.reduce((n, s) => n + s.warnings.length, 0);
  const hopWarnings = [...new Set(plan.hops.flatMap((h) => h.warnings))];
  const notes = plan.warnings.length + stopWarnings + hopWarnings.length;

  const [tab, setTab] = useState<Tab>("route");
  // On phones one panel shows at a time; from lg up everything is visible.
  const panel = (name: Tab) => (tab === name ? "" : "hidden lg:block");

  const daysList = (
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
  );
  const costBody = (
    <>
          <dl className="space-y-2 text-sm">
            <Row label="Places to stay" value={money(plan.estimate.stay)} />
            <Row label="Food, local transport & activities" value={money(plan.estimate.daily)} />
          </dl>
          <p className="mt-3 text-xs text-muted">
            A ballpark from typical prices. Excludes flights, visas and big extras like Sigiriya or safaris.
          </p>
    </>
  );

  return (
    <div className="space-y-6 lg:space-y-8">
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

      <TabBar tab={tab} onChange={setTab} days={plan.days.length} />

      {/* minmax(0, …) columns stop the map's canvas from stretching the page on phones. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div id="panel-map" role="tabpanel" aria-labelledby="tab-map" className={`${panel("map")} lg:sticky lg:top-20 lg:order-last`}>
          <RouteMap data={data} plan={plan} className="h-[60vh] max-h-[34rem] min-h-80 lg:h-[34rem]" />
        </div>
        <section id="panel-route" role="tabpanel" aria-labelledby="tab-route" className={panel("route")}>
          {editor ?? (
            <>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 id="route-heading" className="font-semibold">
                  Your route{edited && <span className="ml-2 text-xs font-normal text-muted">edited</span>}
                </h3>
                {onEdit && (
                  <button type="button" onClick={onEdit} className={`${button.secondary} px-4 py-1.5`}>
                    Edit route
                  </button>
                )}
              </div>
              <p aria-live="polite" className="mb-3 text-sm text-muted empty:hidden">
                {notice}
              </p>
              <ol>
                {plan.stops.map((stop, i) => (
                  <li key={`${stop.destination.slug}-${i}`}>
                    <StopCard
                      stop={stop}
                      countrySlug={data.country.slug}
                      onNights={onNights && stop.role !== "departure" ? (n) => onNights(i, n) : undefined}
                      firstNight={stop.role === "arrival" ? firstNight : undefined}
                    />
                    <HopLine hop={plan.hops[i]} names={names} final={i === plan.stops.length - 1} />
                  </li>
                ))}
                <li className="flex items-center gap-3 pl-[1.15rem] text-sm font-medium">
                  <span className="flex size-6 items-center justify-center rounded-full bg-foreground text-xs text-background" aria-hidden="true">
                    ✈
                  </span>
                  Fly home · Day {plan.days.length}
                </li>
              </ol>
            </>
          )}
        </section>
      </div>

      <div id="panel-days" role="tabpanel" aria-labelledby="tab-days" className={`${panel("days")} lg:hidden`}>
        <div className={`${card} px-4`}>{daysList}</div>
      </div>
      <div id="panel-cost" role="tabpanel" aria-labelledby="tab-cost" className={`${panel("cost")} lg:hidden`}>
        <div className={`${card} p-5`}>
          <p className="mb-3 font-semibold">
            Rough cost: {money(plan.estimate.total)}
            <span className="ml-2 text-sm font-normal text-muted">{BUDGET_LABELS[input.budget]}, one person</span>
          </p>
          {costBody}
        </div>
      </div>

      <div className="hidden space-y-3 lg:block">
        <Disclosure tone="card" summary={`Day-by-day plan (${plan.days.length} days)`}>
          {daysList}
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
          {costBody}
        </Disclosure>
      </div>
    </div>
  );
}

type Tab = "route" | "map" | "days" | "cost";

/** Phone-only tabs that stick under the header, so the route is never more than a tap away. */
function TabBar({ tab, onChange, days }: { tab: Tab; onChange: (t: Tab) => void; days: number }) {
  const tabs: [Tab, string][] = [
    ["route", "Route"],
    ["map", "Map"],
    ["days", `${days} days`],
    ["cost", "Cost"],
  ];
  return (
    <>
    <div id="tabs-anchor" aria-hidden="true" className="lg:hidden" />
    <div className="sticky top-14 z-20 -mx-4 bg-background/90 px-4 py-2 backdrop-blur lg:hidden">
      <div role="tablist" aria-label="Your trip" className="grid grid-cols-4 rounded-full bg-surface-sunken p-1">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            id={`tab-${id}`}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            onClick={() => {
              onChange(id);
              // If the bar has stuck under the header, jump back so the new panel starts at the top.
              const anchor = document.getElementById("tabs-anchor");
              const top = anchor ? anchor.getBoundingClientRect().top : 0;
              if (anchor && top < 56) window.scrollTo({ top: window.scrollY + top - 56, behavior: "instant" as ScrollBehavior });
            }}
            className={`min-h-10 rounded-full text-sm font-medium transition ${tab === id ? "bg-surface shadow-sm" : "text-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
    </>
  );
}

function StopCard({
  stop,
  countrySlug,
  onNights,
  firstNight,
}: {
  stop: PlannedStop;
  countrySlug: string;
  /** When given, the stay length can be changed right here. */
  onNights?: (nights: number) => void;
  /** On the arrival stop: choose where the first night is spent. */
  firstNight?: { options: { slug: string; name: string; hours: number }[]; onChange: (slug: string) => void };
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const days = stop.nights <= 1 ? `Day ${stop.arriveDay}` : `Days ${stop.arriveDay}–${stop.arriveDay + stop.nights - 1}`;
  return (
    <div className={`${card} overflow-hidden`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3 sm:flex-nowrap">
        <Photo photo={stop.destination.photo} sizes="64px" showCredit={false} className="hidden size-14 shrink-0 rounded-xl sm:block sm:size-16" />
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
          className="group order-1 min-h-10 min-w-0 flex-1 text-left"
        >
          <span className="block text-xs font-medium text-muted">
            {days}
            {!onNights && ` · ${stop.nights} night${stop.nights === 1 ? "" : "s"}`}
            {stop.warnings.length > 0 && <span className="ml-1.5 text-warning" title="See details">⚠</span>}
          </span>
          <span className="line-clamp-2 block font-semibold">{stop.destination.name}</span>
          <span className="sr-only">{open ? ", hide details" : ", show details"}</span>
        </button>
        {onNights && (
          <div className="order-3 w-full sm:order-2 sm:w-auto">
            <NightsStepper nights={stop.nights} name={stop.destination.name} onChange={onNights} />
          </div>
        )}
        {firstNight && (
          <div className="order-4 w-full sm:pl-[4.75rem]">
            <FirstNightPicker options={firstNight.options} value={stop.destination.slug} onChange={firstNight.onChange} />
          </div>
        )}
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => setOpen(!open)}
          className={`order-2 flex size-10 shrink-0 items-center justify-center sm:order-3 ${open ? "[&>svg]:rotate-180" : ""}`}
        >
          <Chevron />
        </button>
      </div>
      {open && (
        <div id={panelId} className="space-y-3 border-t border-line px-4 py-4 text-sm">
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
      )}
    </div>
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
