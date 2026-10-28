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

/** The airport at the start of the route: a starting point, not a stay. */
export function AirportRow({ label, note }: { label: string; note: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-line px-3 py-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-sm text-background" aria-hidden="true">
        ✈
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">{note}</p>
        <p className="font-semibold">{label}</p>
      </div>
    </div>
  );
}
