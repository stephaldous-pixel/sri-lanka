const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function monthName(index: number): string {
  return MONTH_NAMES[index] ?? "";
}

/**
 * Turns twelve month ratings into a short "best time" label such as "Dec–Apr"
 * or "Jan–Mar, Aug–Sep". Uses "great" months, or "good" ones if none are great.
 */
export function bestMonthsLabel(months: readonly string[]): string {
  if (months.length !== 12) return "";
  const target = months.includes("great") ? "great" : "good";
  const best = months.map((m) => m === target);
  if (best.every(Boolean)) return "All year";
  if (!best.some(Boolean)) return "";
  // Start just after a non-best month so ranges that wrap past December stay whole.
  const start = (best.findIndex((b) => !b) + 1) % 12;
  const ranges: [number, number][] = [];
  for (let i = 0; i < 12; i++) {
    const m = (start + i) % 12;
    if (!best[m]) continue;
    const last = ranges.at(-1);
    if (last && (last[1] + 1) % 12 === m) last[1] = m;
    else ranges.push([m, m]);
  }
  // Calendar order; a range wrapping past December (e.g. Dec–Mar) counts as starting the year.
  const order = ([a, b]: [number, number]) => (a > b ? a - 12 : a);
  return ranges
    .sort((x, y) => order(x) - order(y))
    .map(([a, b]) => (a === b ? monthName(a) : `${monthName(a)}–${monthName(b)}`))
    .join(", ");
}

export function formatPrice(amount: number, symbol: string): string {
  return `${symbol} ${Math.round(amount).toLocaleString("en-GB")}`;
}

export function formatPriceRange([min, max]: [number, number], symbol: string): string {
  return min === max ? formatPrice(min, symbol) : `${formatPrice(min, symbol)}–${Math.round(max).toLocaleString("en-GB")}`;
}

export function formatHours(hours: number): string {
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  if (whole === 0) return `${minutes} min`;
  return minutes === 0 ? `${whole} hr` : `${whole} hr ${minutes} min`;
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function nightsLabel({ min, ideal, max }: { min: number; ideal: number; max: number }): string {
  const range = min === max ? `${min}` : `${Math.max(min, 1)}–${max}`;
  return `${ideal} night${ideal === 1 ? "" : "s"} (${range} works)`;
}
