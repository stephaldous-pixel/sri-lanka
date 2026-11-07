"use client";

import { useMemo, useState } from "react";
import { formatHours } from "@/lib/format";
import { hoursFromAirport } from "@/planner/engine";
import type { PlannerData, PlannerInput } from "@/planner/types";

/**
 * Choose where to spend the first night, with each place's travel time from
 * the airport (nearest first). Sits on the dotted line between the airport and
 * the first stop.
 */
export function FirstNightPicker({
  data,
  input,
  current,
  onChoose,
}: {
  data: PlannerData;
  input: PlannerInput;
  /** Slug of the current first night. */
  current: string;
  onChoose: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const hours = useMemo(() => hoursFromAirport(data, input), [data, input]);
  const regionName = new Map(data.regions.map((r) => [r.id, r.name]));
  const q = query.trim().toLowerCase();
  const places = data.destinations
    .filter((d) => !q || d.name.toLowerCase().includes(q) || regionName.get(d.region)?.toLowerCase().includes(q))
    .sort((a, b) => hours.get(a.slug)! - hours.get(b.slug)! || a.name.localeCompare(b.name));
  const currentName = data.destinations.find((d) => d.slug === current)?.name ?? current;

  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="group ml-[1.9rem] border-l-2 border-dotted border-line pl-5 pt-2 sm:ml-[2.15rem]"
    >
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-full bg-surface-sunken px-3 py-1.5 text-xs font-medium hover:bg-line [&::-webkit-details-marker]:hidden">
        {open ? "Close" : `First night: ${currentName} · Change`}
      </summary>
      <div className="mt-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
        <p className="text-sm font-medium">Where do you want to spend your first night?</p>
        <p className="mt-0.5 text-xs text-muted">Travel times are from {data.country.gateways[0].shortName}. Your trip stays the same length: nights move between stops.</p>
        <label className="mt-3 block">
          <span className="sr-only">Search places</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search places or regions"
            className="w-full rounded-xl border-0 bg-surface-sunken px-3 py-2 text-sm ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none"
          />
        </label>
        <ul className="mt-2 max-h-72 divide-y divide-line overflow-y-auto">
          {places.map((d) => {
            const chosen = d.slug === current;
            return (
              <li key={d.slug}>
                <button
                  type="button"
                  disabled={chosen}
                  onClick={() => {
                    setOpen(false);
                    setQuery("");
                    onChoose(d.slug);
                  }}
                  className="flex w-full items-center justify-between gap-3 px-1 py-2.5 text-left hover:bg-surface-sunken disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{d.name}</span>
                    <span className="block truncate text-xs text-muted">{regionName.get(d.region)}</span>
                  </span>
                  <span className="shrink-0 text-right text-xs">
                    {chosen ? (
                      <span className="font-medium text-accent">✓ First night</span>
                    ) : (
                      <span className="text-muted">{formatHours(hours.get(d.slug)!)} from the airport</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
          {places.length === 0 && <li className="py-3 text-sm text-muted">No matches.</li>}
        </ul>
      </div>
    </details>
  );
}
