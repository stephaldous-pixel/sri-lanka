"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { Chevron } from "@/components/disclosure";
import { button, card } from "@/lib/ui";
import type { Budget, Pace, PlannerData, PlannerInput, TransportPreference } from "@/planner/types";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const PACES: Option<Pace>[] = [
  { value: "relaxed", label: "Relaxed", hint: "Fewer places, longer stays." },
  { value: "balanced", label: "Balanced", hint: "A mix of moving on and settling in." },
  { value: "packed", label: "Packed", hint: "See as much as possible." },
];
const BUDGETS: Option<Budget>[] = [
  { value: "budget", label: "Budget", hint: "Hostels, guesthouses, local food." },
  { value: "mid", label: "Mid-range", hint: "Private rooms and some treats." },
  { value: "comfort", label: "Comfort", hint: "Boutique hotels, private transfers." },
];
const TRANSPORT: Option<TransportPreference>[] = [
  { value: "public", label: "Public transport", hint: "Buses, trains and tuk tuks." },
  { value: "mixed", label: "Mix", hint: "Whatever's quickest each time." },
  { value: "driver", label: "Car with driver", hint: "Faster, door to door." },
];

type Option<T> = { value: T; label: string; hint: string };

export const DEFAULT_INPUT: PlannerInput = {
  days: 14,
  interests: [],
  regions: [],
  pace: "balanced",
  budget: "budget",
  transport: "public",
  meetPeople: true,
};

const STEPS = ["When", "Interests", "Regions", "Review"] as const;

/** One question at a time; the finer options wait on the last step. */
export function PlannerForm({
  data,
  initial,
  onSubmit,
}: {
  data: PlannerData;
  initial: PlannerInput;
  onSubmit: (input: PlannerInput) => void;
}) {
  const [input, setInput] = useState<PlannerInput>(initial);
  const [step, setStep] = useState(initial.interests.length > 0 ? STEPS.length - 1 : 0);
  const [dateMode, setDateMode] = useState<"date" | "month">(initial.startDate ? "date" : "month");
  const [error, setError] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Move focus to each new question so keyboard and screen-reader users follow along.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    heading.current?.focus();
  }, [step]);

  const set = <K extends keyof PlannerInput>(key: K, value: PlannerInput[K]) => setInput((prev) => ({ ...prev, [key]: value }));
  const toggle = (key: "interests" | "regions", id: string) =>
    setInput((prev) => ({
      ...prev,
      [key]: prev[key].includes(id) ? prev[key].filter((x) => x !== id) : [...prev[key], id],
    }));

  function problem(at: number): string | null {
    if (at === 0) {
      if (dateMode === "date" && !input.startDate) return "Choose your arrival date, or pick a month instead.";
      if (dateMode === "month" && input.month === undefined) return "Choose the month you're travelling.";
      if (!Number.isInteger(input.days) || input.days < 3 || input.days > 60) return "Choose a trip length between 3 and 60 days.";
    }
    if (at === 1 && input.interests.length === 0) return "Pick at least one thing you'd like to do.";
    return null;
  }

  function next(event: FormEvent) {
    event.preventDefault();
    const issue = problem(step);
    setError(issue);
    if (issue) return;
    if (step < STEPS.length - 1) return setStep(step + 1);
    onSubmit(dateMode === "date" ? { ...input, month: undefined } : { ...input, startDate: undefined });
  }

  const label = (options: Option<string>[], value: string) => options.find((o) => o.value === value)?.label;

  return (
    <form onSubmit={next} noValidate className={`${card} mt-8 p-5 sm:p-8`}>
      <div className="flex items-center justify-between text-xs font-medium text-muted">
        <span>
          Step {step + 1} of {STEPS.length}
        </span>
        <span>{STEPS[step]}</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-sunken" aria-hidden="true">
        <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

      <div className="mt-8 min-h-64">
        {step === 0 && (
          <Question heading={heading} title="When are you going?">
            <Segmented
              label="How to choose dates"
              value={dateMode}
              onChange={setDateMode}
              options={[
                { value: "month", label: "Just the month" },
                { value: "date", label: "Exact dates" },
              ]}
            />
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {dateMode === "date" ? (
                <Field label="Arrival date">
                  <input type="date" value={input.startDate ?? ""} onChange={(e) => set("startDate", e.target.value || undefined)} className={inputClass} />
                </Field>
              ) : (
                <Field label="Month">
                  <select
                    value={input.month ?? ""}
                    onChange={(e) => set("month", e.target.value === "" ? undefined : Number(e.target.value))}
                    className={inputClass}
                  >
                    <option value="">Choose a month</option>
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i}>
                        {m}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Number of days" hint="Including arrival and departure">
                <input
                  type="number"
                  inputMode="numeric"
                  min={3}
                  max={60}
                  value={Number.isNaN(input.days) ? "" : input.days}
                  onChange={(e) => set("days", e.target.valueAsNumber)}
                  className={inputClass}
                />
              </Field>
            </div>
          </Question>
        )}

        {step === 1 && (
          <Question heading={heading} title="What do you love doing?" hint="Pick a few. More picks give a more varied route.">
            <div className="flex flex-wrap gap-2">
              {data.interests.map((interest) => (
                <Chip key={interest.id} checked={input.interests.includes(interest.id)} onChange={() => toggle("interests", interest.id)} title={interest.description}>
                  {interest.name}
                </Chip>
              ))}
            </div>
          </Question>
        )}

        {step === 2 && (
          <Question heading={heading} title="Anywhere you want to focus on?" hint="Optional. Skip this and we'll choose by season and interests.">
            <div className="flex flex-wrap gap-2">
              {data.regions.map((region) => (
                <Chip key={region.id} checked={input.regions.includes(region.id)} onChange={() => toggle("regions", region.id)}>
                  {region.name}
                </Chip>
              ))}
            </div>
          </Question>
        )}

        {step === 3 && (
          <Question heading={heading} title="Ready to build your route">
            <dl className="divide-y divide-line text-sm">
              <ReviewRow label="When" onEdit={() => setStep(0)}>
                {input.days} days{" "}
                {dateMode === "date" && input.startDate
                  ? `from ${new Date(`${input.startDate}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}`
                  : input.month !== undefined
                    ? `in ${MONTHS[input.month]}`
                    : ""}
              </ReviewRow>
              <ReviewRow label="Interests" onEdit={() => setStep(1)}>
                {input.interests.map((id) => data.interests.find((i) => i.id === id)?.name).join(", ")}
              </ReviewRow>
              <ReviewRow label="Regions" onEdit={() => setStep(2)}>
                {input.regions.length ? input.regions.map((id) => data.regions.find((r) => r.id === id)?.name).join(", ") : "Anywhere"}
              </ReviewRow>
            </dl>

            <details className="group mt-6 rounded-xl bg-surface-sunken px-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="font-medium">Travel style: </span>
                  <span className="text-muted">
                    {label(PACES, input.pace)} · {label(BUDGETS, input.budget)} · {label(TRANSPORT, input.transport)}
                    {input.meetPeople ? " · Meet people" : ""}
                  </span>
                </span>
                <span className="flex items-center gap-1 text-sm font-medium">
                  Adjust <Chevron />
                </span>
              </summary>
              <div className="space-y-6 pb-5 pt-2">
                <OptionGroup legend="Pace" name="pace" options={PACES} value={input.pace} onChange={(v) => set("pace", v)} />
                <OptionGroup legend="Budget" name="budget" options={BUDGETS} value={input.budget} onChange={(v) => set("budget", v)} />
                <OptionGroup legend="Getting around" name="transport" options={TRANSPORT} value={input.transport} onChange={(v) => set("transport", v)} />
                <label className="flex items-center gap-3 text-sm">
                  <input type="checkbox" checked={input.meetPeople} onChange={(e) => set("meetPeople", e.target.checked)} className="size-4 accent-[var(--accent)]" />
                  Prefer sociable places where it&apos;s easy to meet other travellers
                </label>
              </div>
            </details>
          </Question>
        )}
      </div>

      <p aria-live="polite" className="mt-4 min-h-5 text-sm text-danger">
        {error}
      </p>
      <div className="mt-2 flex items-center justify-between gap-3">
        {step > 0 ? (
          <button type="button" onClick={() => (setError(null), setStep(step - 1))} className={button.quiet}>
            ← Back
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-4">
          {step === 2 && input.regions.length === 0 && <span className="hidden text-sm text-muted sm:inline">No preference</span>}
          <button type="submit" className={button.primary}>
            {step === STEPS.length - 1 ? "Build my route" : "Continue"}
          </button>
        </div>
      </div>
    </form>
  );
}

const inputClass =
  "mt-1.5 block w-full rounded-xl border-0 bg-surface-sunken px-4 py-3 text-base ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none";

function Question({ heading, title, hint, children }: { heading: RefObject<HTMLHeadingElement | null>; title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="contents">
        <h2 ref={heading} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
          {title}
        </h2>
      </legend>
      {hint && <p className="mt-1 text-muted">{hint}</p>}
      <div className="mt-6">{children}</div>
    </fieldset>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="ml-1 text-sm text-muted">· {hint}</span>}
      {children}
    </label>
  );
}

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-surface-sunken p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            value === o.value ? "bg-surface shadow-sm" : "text-muted hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Chip({ checked, onChange, title, children }: { checked: boolean; onChange: () => void; title?: string; children: ReactNode }) {
  return (
    <label
      title={title}
      className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
        checked ? "bg-accent text-on-accent shadow-sm" : "bg-surface-sunken hover:bg-line"
      }`}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      {checked && <span aria-hidden="true">✓ </span>}
      {children}
    </label>
  );
}

function ReviewRow({ label, onEdit, children }: { label: string; onEdit: () => void; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="w-24 shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
      <dd>
        <button type="button" onClick={onEdit} className={button.quiet}>
          Edit<span className="sr-only"> {label.toLowerCase()}</span>
        </button>
      </dd>
    </div>
  );
}

function OptionGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {options.map((o) => (
          <label
            key={o.value}
            className={`cursor-pointer rounded-xl px-3 py-2.5 text-sm transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
              value === o.value ? "bg-surface shadow-sm ring-2 ring-accent" : "bg-surface/60 ring-1 ring-line hover:bg-surface"
            }`}
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            <span className="font-medium">{o.label}</span>
            <span className="block text-xs text-muted">{o.hint}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
