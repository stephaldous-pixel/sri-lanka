"use client";

import { useMemo, useState } from "react";
import { Grip, NightsStepper } from "./controls";
import { SortableList } from "./sortable-list";
import { Photo } from "@/components/photo";
import { button, card } from "@/lib/ui";
import { bestPositionFor, suggestedNights, type EditedRoute } from "@/planner/engine";
import type { PlannerData, PlannerDestination, PlannerInput } from "@/planner/types";

/** Drag to reorder, change nights, remove and add places. Changes apply straight away. */
export function RouteEditor({
  data,
  input,
  edits,
  days,
  originalDays,
  onChange,
  onDone,
  onReset,
}: {
  data: PlannerData;
  input: PlannerInput;
  edits: EditedRoute;
  /** Trip length with these edits, including any last night near the airport. */
  days: number;
  /** Trip length the traveller first asked for, to show the difference. */
  originalDays: number;
  onChange: (edits: EditedRoute) => void;
  onDone: () => void;
  onReset: () => void;
}) {
  const bySlug = useMemo(() => new Map(data.destinations.map((d) => [d.slug, d])), [data]);
  const gateway = bySlug.get(data.country.gateways[0].destination)!;
  const [message, setMessage] = useState<string | null>(null);
  const name = (slug: string | number) => bySlug.get(String(slug))?.name ?? String(slug);

  const diff = days - originalDays;

  function update(stops: EditedRoute["stops"], arrivalNights = edits.arrivalNights) {
    onChange({ arrivalNights, stops });
  }

  function move(from: number, to: number) {
    const stops = [...edits.stops];
    const [moved] = stops.splice(from, 1);
    stops.splice(to, 0, moved);
    update(stops);
    setMessage(`Moved ${name(moved.slug)} ${to < from ? "up" : "down"}: now stop ${to + 1} of ${stops.length}.`);
  }

  function add(slug: string) {
    const index = bestPositionFor(data, input, edits.stops.map((s) => s.slug), slug);
    const stops = [...edits.stops];
    stops.splice(index, 0, { slug, nights: suggestedNights(data, input, slug) });
    update(stops);
    const after = index === 0 ? gateway.name : name(stops[index - 1].slug);
    setMessage(`Added ${name(slug)} after ${after}, where it adds the least travel. Drag to move it.`);
  }

  return (
    <div className="space-y-4">
      <div className={`${card} flex flex-wrap items-center justify-between gap-3 p-4`}>
        <p className="text-sm">
          <span className="font-semibold">{days} days</span>
          {diff !== 0 && (
            <span className="text-muted">
              {" "}
              · {Math.abs(diff)} {diff > 0 ? "more" : "fewer"} than you planned
            </span>
          )}
        </p>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onReset} className={button.quiet}>
            Reset
          </button>
          <button type="button" onClick={onDone} className={button.primary}>
            Done
          </button>
        </div>
      </div>
      <p className="text-sm text-muted">
        Drag <Grip /> to reorder, or focus it and use the ↑ ↓ keys. We&apos;ll add a night near the airport if your last stop is far away.
      </p>

      <ol className="space-y-2">
        <li className={`${card} flex items-center gap-3 p-3`}>
          <span className="w-8 shrink-0 text-center text-xs text-muted" aria-hidden="true">
            ✈
          </span>
          <StopLabel destination={gateway} note="Arrival" />
          <NightsStepper nights={edits.arrivalNights} name={gateway.name} onChange={(n) => update(edits.stops, n)} />
          <span className="w-9 shrink-0" />
        </li>
      </ol>

      <SortableList
        label="Stops, in order"
        items={edits.stops.map((s) => s.slug)}
        onMove={move}
        renderItem={(slug, i, handle) => {
          const stop = edits.stops[i];
          const destination = bySlug.get(slug)!;
          return (
            <>
              {handle(`Move ${destination.name}`)}
              <StopLabel destination={destination} />
              <NightsStepper
                nights={stop.nights}
                name={destination.name}
                onChange={(n) => update(edits.stops.map((s, j) => (j === i ? { ...s, nights: n } : s)))}
              />
              <button
                type="button"
                onClick={() => {
                  update(edits.stops.filter((_, j) => j !== i));
                  setMessage(`Removed ${destination.name}.`);
                }}
                aria-label={`Remove ${destination.name}`}
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-sunken hover:text-danger"
              >
                ✕
              </button>
            </>
          );
        }}
      />

      {edits.stops.length === 0 && <p className="text-sm text-muted">No stops yet. Add some places below.</p>}
      <p aria-live="polite" className="min-h-5 text-sm text-muted">
        {message}
      </p>

      <AddPlace data={data} exclude={new Set([gateway.slug, ...edits.stops.map((s) => s.slug)])} onAdd={add} />
    </div>
  );
}

function StopLabel({ destination, note }: { destination: PlannerDestination; note?: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <Photo photo={destination.photo} sizes="48px" showCredit={false} className="hidden size-12 shrink-0 rounded-lg sm:block" />
      <div className="min-w-0">
        {note && <p className="text-xs text-muted">{note}</p>}
        <p className="truncate font-medium">{destination.name}</p>
      </div>
    </div>
  );
}


function AddPlace({ data, exclude, onAdd }: { data: PlannerData; exclude: Set<string>; onAdd: (slug: string) => void }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const groups = data.regions
    .map((region) => ({
      region,
      places: data.destinations.filter(
        (d) => d.region === region.id && !exclude.has(d.slug) && (!q || d.name.toLowerCase().includes(q) || region.name.toLowerCase().includes(q)),
      ),
    }))
    .filter((g) => g.places.length > 0);

  return (
    <details className={`group ${card} px-4`}>
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 font-medium [&::-webkit-details-marker]:hidden">
        <span>+ Add a place</span>
        <span className="text-sm font-normal text-muted group-open:hidden">{data.destinations.length - exclude.size} more to choose from</span>
      </summary>
      <div className="pb-4">
        <label className="block">
          <span className="sr-only">Search places</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search places or regions"
            className="w-full rounded-xl border-0 bg-surface-sunken px-4 py-2.5 ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none"
          />
        </label>
        <div className="mt-4 max-h-80 space-y-4 overflow-y-auto">
          {groups.map(({ region, places }) => (
            <div key={region.id}>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">{region.name}</p>
              <ul className="mt-1 divide-y divide-line">
                {places.map((d) => (
                  <li key={d.slug} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{d.name}</span>
                      <span className="block truncate text-xs text-muted">{d.summary}</span>
                    </span>
                    <button type="button" onClick={() => onAdd(d.slug)} className="shrink-0 rounded-full bg-surface-sunken px-3 py-1 text-sm font-medium hover:bg-line">
                      Add
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {groups.length === 0 && <p className="text-sm text-muted">No matches.</p>}
        </div>
      </div>
    </details>
  );
}
