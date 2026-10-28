"use client";

import { useState } from "react";
import { daysInclusive, formatRange, monthGrid, parseIso } from "@/lib/dates";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const MIN_DAYS = 3;
export const MAX_DAYS = 60;

/**
 * Tap the first day, then the last. Shows one month on phones and two side by
 * side on wider screens, so trips that cross a month end are easy to pick.
 */
export function DateRangePicker({
  start,
  end,
  today,
  onChange,
}: {
  start?: string;
  end?: string;
  /** YYYY-MM-DD; earlier days can't be picked. */
  today: string;
  onChange: (start: string | undefined, end: string | undefined) => void;
}) {
  const anchor = parseIso(start ?? today);
  const [view, setView] = useState({ year: anchor.year, month: anchor.month });
  const [hint, setHint] = useState<string | null>(null);
  const atFirstMonth = view.year === parseIso(today).year && view.month === parseIso(today).month;

  const shift = (by: number) =>
    setView(({ year, month }) => {
      const m = month + by;
      return { year: year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });

  function pick(day: string) {
    if (!start || end || day < start) {
      setHint("Now tap your last day.");
      return onChange(day, undefined);
    }
    const days = daysInclusive(start, day);
    if (days < MIN_DAYS) return setHint(`Trips need at least ${MIN_DAYS} days. Tap a later day.`);
    if (days > MAX_DAYS) return setHint(`Trips can be up to ${MAX_DAYS} days. Tap an earlier day.`);
    setHint(null);
    onChange(start, day);
  }

  const second = { year: view.month === 11 ? view.year + 1 : view.year, month: (view.month + 1) % 12 };

  return (
    <div>
      <div className="flex items-center justify-between">
        <NavButton label="Previous month" onClick={() => shift(-1)} disabled={atFirstMonth}>
          ‹
        </NavButton>
        <p className="text-sm font-medium sm:hidden">
          {MONTHS[view.month]} {view.year}
        </p>
        <NavButton label="Next month" onClick={() => shift(1)}>
          ›
        </NavButton>
      </div>

      <div className="mt-2 grid gap-8 sm:grid-cols-2">
        <Month year={view.year} month={view.month} start={start} end={end} today={today} onPick={pick} />
        <div className="hidden sm:block">
          <Month year={second.year} month={second.month} start={start} end={end} today={today} onPick={pick} />
        </div>
      </div>

      <div className="mt-4 flex min-h-10 flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-sunken px-4 py-2.5 text-sm" aria-live="polite">
        {start && end ? (
          <>
            <span>
              <span className="font-semibold">{formatRange(start, end)}</span>
              <span className="text-muted"> · {daysInclusive(start, end)} days</span>
            </span>
            <button type="button" onClick={() => (setHint(null), onChange(undefined, undefined))} className="text-muted underline-offset-4 hover:underline">
              Clear
            </button>
          </>
        ) : (
          <span className="text-muted">{hint ?? (start ? "Now tap your last day." : "Tap the day you arrive.")}</span>
        )}
      </div>
      {start && end && hint && <p className="mt-2 text-sm text-muted">{hint}</p>}
    </div>
  );
}

function Month({
  year,
  month,
  start,
  end,
  today,
  onPick,
}: {
  year: number;
  month: number;
  start?: string;
  end?: string;
  today: string;
  onPick: (day: string) => void;
}) {
  return (
    <table className="w-full table-fixed border-collapse text-center text-sm">
      <caption className="hidden pb-2 text-sm font-medium sm:table-caption">
        {MONTHS[month]} {year}
      </caption>
      <thead>
        <tr>
          {WEEKDAYS.map((d) => (
            <th key={d} scope="col" className="pb-1 text-xs font-normal text-muted">
              {d}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {monthGrid(year, month).map((week, w) => (
          <tr key={w}>
            {week.map((day, i) => {
              if (!day) return <td key={i} />;
              const past = day < today;
              const isEdge = day === start || day === end;
              const inRange = !!start && !!end && day > start && day < end;
              const label = new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
              return (
                <td key={day} className={`p-0 ${inRange ? "bg-accent/15" : ""} ${day === start && end ? "rounded-l-full bg-accent/15" : ""} ${day === end ? "rounded-r-full bg-accent/15" : ""}`}>
                  <button
                    type="button"
                    disabled={past}
                    aria-label={`${label}${day === start ? ", arrival" : day === end ? ", departure" : ""}`}
                    aria-pressed={isEdge}
                    onClick={() => onPick(day)}
                    className={`mx-auto flex size-10 items-center justify-center rounded-full transition focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:text-muted/40 ${
                      isEdge ? "bg-accent font-semibold text-on-accent" : past ? "" : "hover:bg-surface-sunken"
                    } ${day === today && !isEdge ? "font-semibold underline underline-offset-4" : ""}`}
                  >
                    {parseIso(day).day}
                  </button>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function NavButton({ label, onClick, disabled = false, children }: { label: string; onClick: () => void; disabled?: boolean; children: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-9 items-center justify-center rounded-full text-xl text-muted transition hover:bg-surface-sunken hover:text-foreground disabled:opacity-30"
    >
      {children}
    </button>
  );
}
