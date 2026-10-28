import type { ReactNode } from "react";

/**
 * Show-more section built on <details>, so it works without JavaScript and
 * with keyboards and screen readers out of the box.
 */
export function Disclosure({
  summary,
  children,
  defaultOpen = false,
  className = "",
  tone = "plain",
}: {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  tone?: "plain" | "card" | "warning";
}) {
  const tones = {
    plain: "border-b border-line",
    card: "rounded-2xl bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.04)] px-5",
    warning: "rounded-2xl bg-warning-bg px-5",
  };
  return (
    <details open={defaultOpen} className={`group ${tones[tone]} ${className}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">{summary}</span>
        <Chevron />
      </summary>
      <div className="pb-5">{children}</div>
    </details>
  );
}

export function Chevron() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="size-5 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
    >
      <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
