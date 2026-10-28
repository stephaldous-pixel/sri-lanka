import type { TravelLeg } from "@/content/schema";
import { formatHours } from "@/lib/format";

const MODE_LABELS = {
  train: "Train",
  bus: "Bus",
  car: "Car / driver",
  "tuk-tuk": "Tuk tuk",
  ferry: "Ferry",
  flight: "Flight",
} as const;

const STATUS = {
  running: null,
  disrupted: { label: "Disrupted", className: "bg-warning-bg text-warning" },
  suspended: { label: "Not running", className: "bg-season-poor text-season-poor-ink" },
} as const;

export function TravelOptions({ options }: { options: TravelLeg["options"] }) {
  return (
    <ul className="space-y-1.5">
      {options.map((o) => {
        const status = STATUS[o.status];
        return (
          <li key={o.mode}>
            <span className={o.status === "suspended" ? "text-muted line-through" : ""}>
              <span className="font-medium">{MODE_LABELS[o.mode]}</span> · {formatHours(o.hours)}
            </span>
            {status && (
              <span className={`ml-2 rounded px-1.5 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
            )}
            {o.note && <div className="text-xs text-muted">{o.note}</div>}
          </li>
        );
      })}
    </ul>
  );
}
