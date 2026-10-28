"use client";

import { useMemo, useState } from "react";
import { Grip, NightsStepper } from "./controls";
import { SortableList } from "./sortable-list";
import { Photo } from "@/components/photo";
import { button, card } from "@/lib/ui";
import { bestPositionFor, fromStopList, suggestedNights, toStopList, type EditedRoute, type ListStop } from "@/planner/engine";
import type { PlannerData, PlannerDestination, PlannerInput } from "@/planner/types";

/** Drag to reorder, change nights, remove and add places. Changes apply straight away. */
export function RouteEditor({
  data,
  input,
  edits,
  days,
  onChange,
  onDone,
  onReset,
}: {
  data: PlannerData;
  input: PlannerInput;
  edits: EditedRoute;
  /** Trip length with these edits, including any last night near the airport. */
  days: number;
  /**
   * Apply a change. The trip length stays fixed, so nights are moved between
   * other stops; `protect` (a slug or ARRIVAL) keeps the nights it was given.
   * Returns false if it can't fit.
   */
  onChange: (edits: EditedRoute, protect?: string) => boolean;
  onDone: () => void;
  onReset: () => void;
}) {
  const bySlug = useMemo(() => new Map(data.destinations.map((d) => [d.slug, d])), [data]);
  // Every stop, the first night included, is edited the same way.
  const list = toStopList(data, edits);
  const [message, setMessage] = useState<string | null>(null);
  const name = (slug: string | number) => bySlug.get(String(slug))?.name ?? String(slug);

  const tooFew = "Every other stop is already down to 1 night. Remove a stop to make room, or change your dates.";

  /** Apply a new list; `protect` keeps that stop's nights while others rebalance. */
  function update(next: ListStop[], protect?: string): boolean {
    const route = fromStopList(next);
    if (!route) {
      setMessage("Your trip needs at least one place. Add another before removing this one.");
      return false;
    }
    const ok = onChange(route, protect);
    if (!ok) setMessage(tooFew);
    return ok;
  }

  function setNights(slug: string, nights: number) {
    if (update(list.map((s) => (s.slug === slug ? { ...s, nights } : s)), slug)) {
      setMessage(`${name(slug)}: ${nights} night${nights === 1 ? "" : "s"}. Other stops adjusted to keep your ${days} days.`);
    }
  }

  function move(from: number, to: number) {
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    if (!update(next)) return;
    setMessage(
      to === 0
        ? `${name(moved.slug)} is now your first night.`
        : `Moved ${name(moved.slug)} ${to < from ? "up" : "down"}: now stop ${to + 1} of ${next.length}.`,
    );
  }

  function remove(index: number) {
    const removed = list[index];
    const next = list.filter((_, j) => j !== index);
    if (!update(next)) return;
    setMessage(
      index === 0 && next.length > 0
        ? `Removed ${name(removed.slug)}. Your first night is now in ${name(next[0].slug)}.`
        : `Removed ${name(removed.slug)}. Its nights went to other stops.`,
    );
  }

  function add(slug: string) {
    const index = bestPositionFor(data, input, list.map((s) => s.slug), slug);
    const withNights = (nights: number) => {
      const next = [...list];
      next.splice(index, 0, { slug, nights });
      return fromStopList(next)!;
    };
    const suggested = suggestedNights(data, input, slug);
    const added = onChange(withNights(suggested), slug) || (suggested > 1 && onChange(withNights(1), slug));
    if (!added) return setMessage(`No room for ${name(slug)}. ${tooFew}`);
    setMessage(
      index === 0
        ? `Added ${name(slug)} as your first night, where it adds the least travel. Drag to move it.`
        : `Added ${name(slug)} after ${name(list[index - 1].slug)}, where it adds the least travel. Nights taken from other stops to keep your ${days} days.`,
    );
  }

  return (
    <div className="space-y-4">
      <div className={`${card} flex flex-wrap items-center justify-between gap-3 p-4`}>
        <p className="text-sm">
          <span className="font-semibold">{days} days</span>
          <span className="text-muted"> · fixed to your dates</span>
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
        Drag <Grip /> to reorder, or focus it and use the ↑ ↓ keys. The top stop is your first night. Your trip stays {days} days: changing one stop moves nights to or from the others. We&apos;ll add a night near the airport if your last stop is far away.
      </p>

      <SortableList
        label="Stops, in order"
        items={list.map((s) => s.slug)}
        onMove={move}
        renderItem={(slug, i, handle) => {
          const stop = list[i];
          const destination = bySlug.get(slug)!;
          return (
            <>
              {handle(`Move ${destination.name}`)}
              <StopLabel destination={destination} note={i === 0 ? "First night" : undefined} />
              <NightsStepper nights={stop.nights} name={destination.name} onChange={(n) => setNights(slug, n)} />
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove ${destination.name}`}
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-sunken hover:text-danger"
              >
                ✕
              </button>
            </>
          );
        }}
      />

      <p aria-live="polite" className="min-h-5 text-sm text-muted">
        {message}
      </p>

      <AddPlace data={data} exclude={new Set(list.map((s) => s.slug))} onAdd={add} />
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
