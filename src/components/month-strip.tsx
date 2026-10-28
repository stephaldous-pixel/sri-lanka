"use client";

import { useId, useState } from "react";
import type { z } from "zod";
import type { ClimateStation, MonthRating } from "@/content/schema";
import { monthName } from "@/lib/format";

type Rating = z.infer<typeof MonthRating>;

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const LABELS: Record<Rating, string> = {
  great: "Great",
  good: "Good",
  mixed: "Mixed",
  poor: "Poor",
};

const VERDICTS: Record<Rating, string> = {
  great: "A great time to visit",
  good: "A good time to visit",
  mixed: "Mixed: expect some rain or rough seas",
  poor: "Poor: monsoon rain, rough seas or closures",
};

const STYLES: Record<Rating, string> = {
  great: "bg-season-great text-season-great-ink",
  good: "bg-season-good text-season-good-ink",
  mixed: "bg-season-mixed text-season-mixed-ink",
  poor: "bg-season-poor text-season-poor-ink",
};

function rainWords(mm: number) {
  if (mm < 60) return "Mostly dry";
  if (mm < 150) return "Some rain";
  if (mm < 250) return "Wet";
  return "Very wet";
}

/**
 * Twelve months coloured by how good each is for visiting. With `climate`,
 * each month can be tapped to show typical temperature and rainfall.
 */
export function MonthStrip({
  months,
  label,
  climate,
  compact = false,
}: {
  months: Rating[];
  label: string;
  climate?: ClimateStation;
  compact?: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const panelId = useId();
  const interactive = !!climate;

  return (
    <div>
      <ol aria-label={label} className="grid grid-cols-12 gap-0.5">
        {months.map((rating, i) => {
          const name = `${monthName(i)}: ${LABELS[rating]}`;
          const cell = `flex w-full flex-col items-center justify-center rounded-sm ${compact ? "h-7" : "h-11"} ${STYLES[rating]}`;
          const text = (
            <>
              <span className={`font-medium ${compact ? "text-[0.65rem]" : "text-xs"}`} aria-hidden="true">
                {monthName(i).charAt(0)}
              </span>
              <span className="sr-only">{name}</span>
            </>
          );
          return (
            <li key={i}>
              {interactive ? (
                <button
                  type="button"
                  title={`${name}. Tap for weather`}
                  aria-pressed={selected === i}
                  aria-controls={panelId}
                  onClick={() => setSelected(selected === i ? null : i)}
                  className={`${cell} cursor-pointer transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foreground ${
                    selected === i ? "outline-2 outline-offset-1 outline-foreground" : ""
                  }`}
                >
                  {text}
                </button>
              ) : (
                <div title={name} className={cell}>
                  {text}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {interactive && (
        <div id={panelId} aria-live="polite">
          {selected === null ? (
            <p className="mt-2 text-xs text-muted">Tap a month for typical temperature and rainfall.</p>
          ) : (
            <MonthDetail month={selected} rating={months[selected]} climate={climate} />
          )}
        </div>
      )}
    </div>
  );
}

function MonthDetail({ month, rating, climate }: { month: number; rating: Rating; climate: ClimateStation }) {
  const c = climate.months[month];
  return (
    <div className="mt-3 rounded-xl bg-surface-sunken p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-semibold">{MONTH_NAMES[month]}</p>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[rating]}`}>{LABELS[rating]}</span>
      </div>
      <p className="mt-0.5 text-sm text-muted">{VERDICTS[rating]}</p>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted">Temperature</dt>
          <dd className="mt-0.5">
            <span className="text-lg font-semibold">{Math.round(c.high)}°</span>
            <span className="text-muted"> / {Math.round(c.low)}°C</span>
          </dd>
          <dd className="text-xs text-muted">day / night</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Rainfall</dt>
          <dd className="mt-0.5">
            <span className="text-lg font-semibold">{c.rainMm} mm</span>
          </dd>
          <dd className="text-xs text-muted">
            {rainWords(c.rainMm)} · about {Math.round(c.rainDays)} rainy day{Math.round(c.rainDays) === 1 ? "" : "s"}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-muted">
        Typical weather at{" "}
        <a href={climate.source} className="underline" target="_blank" rel="noopener noreferrer">
          {climate.name}
        </a>{" "}
        ({climate.elevationM.toLocaleString("en-GB")} m) · {climate.basis}
      </p>
    </div>
  );
}

export function MonthLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Key">
      {(Object.keys(LABELS) as Rating[]).map((rating) => (
        <li key={rating} className="flex items-center gap-1.5">
          <span className={`inline-block size-3 rounded-sm ${STYLES[rating]}`} aria-hidden="true" />
          {LABELS[rating]}
        </li>
      ))}
    </ul>
  );
}
