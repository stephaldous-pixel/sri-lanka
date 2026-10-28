// Shared class names so buttons and surfaces look the same everywhere.

export const button = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-on-accent shadow-sm transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-full bg-surface px-5 py-2.5 text-sm font-medium shadow-sm ring-1 ring-line transition hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  quiet:
    "inline-flex items-center gap-1 text-sm font-medium text-muted underline-offset-4 transition hover:text-foreground hover:underline",
} as const;

export const card = "rounded-2xl bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.04)]";

export const eyebrow = "text-xs font-semibold uppercase tracking-[0.12em] text-accent";
