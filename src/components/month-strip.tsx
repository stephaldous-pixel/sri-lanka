import type { z } from "zod";
import type { MonthRating } from "@/content/schema";
import { monthName } from "@/lib/format";

type Rating = z.infer<typeof MonthRating>;

const LABELS: Record<Rating, string> = {
  great: "Great",
  good: "Good",
  mixed: "Mixed",
  poor: "Poor",
};

const STYLES: Record<Rating, string> = {
  great: "bg-season-great text-season-great-ink",
  good: "bg-season-good text-season-good-ink",
  mixed: "bg-season-mixed text-season-mixed-ink",
  poor: "bg-season-poor text-season-poor-ink",
};

/** Twelve months coloured by how good each is for visiting. */
export function MonthStrip({ months, label, compact = false }: { months: Rating[]; label: string; compact?: boolean }) {
  return (
    <ol aria-label={label} className="grid grid-cols-12 gap-0.5">
      {months.map((rating, i) => (
        <li
          key={i}
          title={`${monthName(i)}: ${LABELS[rating]}`}
          className={`flex flex-col items-center justify-center rounded-sm ${compact ? "h-6" : "h-11"} ${STYLES[rating]}`}
        >
          <span className={`font-medium ${compact ? "text-[0.6rem]" : "text-xs"}`} aria-hidden="true">
            {monthName(i).charAt(0)}
          </span>
          <span className="sr-only">
            {monthName(i)}: {LABELS[rating]}
          </span>
        </li>
      ))}
    </ol>
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
