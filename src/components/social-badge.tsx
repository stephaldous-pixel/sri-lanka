const LABELS = {
  1: "Quiet: few other travellers",
  2: "Some travellers around",
  3: "Easy to meet people",
} as const;

/** How easy it is to meet other travellers somewhere, shown as three dots. */
export function SocialBadge({ level }: { level: 1 | 2 | 3 }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span className="flex gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`size-2 rounded-full ${n <= level ? "bg-accent" : "bg-line"}`} />
        ))}
      </span>
      {LABELS[level]}
    </span>
  );
}
