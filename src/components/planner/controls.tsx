"use client";

// Small controls shared by the route list and the route editor.

/** − n nights + */
export function NightsStepper({ nights, name, onChange }: { nights: number; name: string; onChange: (n: number) => void }) {
  const step = "flex size-10 items-center sm:size-8 justify-center rounded-full bg-surface-sunken text-lg leading-none hover:bg-line disabled:opacity-30";
  return (
    <div className="flex shrink-0 items-center gap-1.5" role="group" aria-label={`Nights in ${name}`}>
      <button type="button" className={step} onClick={() => onChange(nights - 1)} disabled={nights <= 1} aria-label={`One fewer night in ${name}`}>
        −
      </button>
      <span className="w-16 text-center text-sm font-medium tabular-nums" aria-live="polite">
        {nights} night{nights === 1 ? "" : "s"}
      </span>
      <button type="button" className={step} onClick={() => onChange(nights + 1)} disabled={nights >= 30} aria-label={`One more night in ${name}`}>
        +
      </button>
    </div>
  );
}

/** The ⠿ drag-handle icon. */
export function Grip() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 18" className="inline-block h-4 w-3 align-[-2px]">
      {[3, 9].map((x) => [3, 9, 15].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" fill="currentColor" />))}
    </svg>
  );
}

/** Where to spend the first night, nearest the airport first. */
export function FirstNightPicker({
  options,
  value,
  onChange,
}: {
  options: { slug: string; name: string; hours: number }[];
  value: string;
  onChange: (slug: string) => void;
}) {
  const time = (h: number) => (h < 1 ? `${Math.round(h * 60)} min` : `${Math.floor(h)} hr${h % 1 >= 0.25 ? ` ${Math.round((h % 1) * 60)} min` : ""}`);
  return (
    <label className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <span className="text-muted">First night in</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-10 max-w-full rounded-lg border-0 bg-surface-sunken px-3 py-2 text-base ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none sm:min-h-0 sm:py-1.5 sm:text-sm"
      >
        {options.map((o) => (
          <option key={o.slug} value={o.slug}>
            {o.name} · {time(o.hours)} from the airport
          </option>
        ))}
      </select>
    </label>
  );
}
