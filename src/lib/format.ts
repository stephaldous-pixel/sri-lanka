const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function monthName(index: number): string {
  return MONTH_NAMES[index] ?? "";
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
