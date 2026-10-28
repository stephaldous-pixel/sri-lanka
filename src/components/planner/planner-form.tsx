"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import type { Budget, Pace, PlannerData, PlannerInput, TransportPreference } from "@/planner/types";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const PACES: { value: Pace; label: string; hint: string }[] = [
  { value: "relaxed", label: "Relaxed", hint: "Fewer places, longer stays, less time on the road." },
  { value: "balanced", label: "Balanced", hint: "A good mix of moving on and settling in." },
  { value: "packed", label: "Packed", hint: "See as much as possible; shorter stays." },
];
const BUDGETS: { value: Budget; label: string; hint: string }[] = [
  { value: "budget", label: "Budget", hint: "Hostels and guesthouses, local food." },
  { value: "mid", label: "Mid-range", hint: "Private rooms, some tours and treats." },
  { value: "comfort", label: "Comfort", hint: "Boutique hotels and private transfers." },
];
const TRANSPORT: { value: TransportPreference; label: string; hint: string }[] = [
  { value: "public", label: "Public transport", hint: "Buses, trains and tuk tuks. Cheapest." },
  { value: "mixed", label: "Mix", hint: "Whatever's quickest for each journey." },
  { value: "driver", label: "Car with driver", hint: "Faster and door to door. Costs more." },
];

export const DEFAULT_INPUT: PlannerInput = {
  days: 14,
  interests: [],
  regions: [],
  pace: "balanced",
  budget: "budget",
  transport: "public",
  meetPeople: true,
};

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
  const [dateMode, setDateMode] = useState<"date" | "month">(initial.startDate ? "date" : "month");
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof PlannerInput>(key: K, value: PlannerInput[K]) => setInput((prev) => ({ ...prev, [key]: value }));
  const toggle = (key: "interests" | "regions", id: string) =>
    setInput((prev) => ({
      ...prev,
      [key]: prev[key].includes(id) ? prev[key].filter((x) => x !== id) : [...prev[key], id],
    }));

  function submit(event: FormEvent) {
    event.preventDefault();
    if (dateMode === "date" && !input.startDate) return setError("Choose your start date, or switch to picking a month.");
    if (dateMode === "month" && input.month === undefined) return setError("Choose the month you're travelling.");
    if (!Number.isInteger(input.days) || input.days < 3 || input.days > 60) return setError("Choose a trip length between 3 and 60 days.");
    if (input.interests.length === 0) return setError("Pick at least one thing you'd like to do.");
    setError(null);
    onSubmit(
      dateMode === "date"
        ? { ...input, month: undefined }
        : { ...input, startDate: undefined },
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-10" noValidate>
      <Fieldset legend="When are you going?">
        <div className="flex gap-2" role="radiogroup" aria-label="How to choose dates">
          {(
            [
              ["date", "I know my dates"],
              ["month", "Just the month"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={dateMode === mode}
              onClick={() => setDateMode(mode)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                dateMode === mode ? "border-accent bg-accent text-on-accent" : "border-line hover:bg-surface-sunken"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {dateMode === "date" ? (
            <label className="block">
              <span className="text-sm font-medium">Arrival date</span>
              <input
                type="date"
                value={input.startDate ?? ""}
                onChange={(e) => set("startDate", e.target.value || undefined)}
                className="mt-1 block w-full rounded-lg border border-line bg-surface px-3 py-2"
              />
            </label>
          ) : (
            <label className="block">
              <span className="text-sm font-medium">Month</span>
              <select
                value={input.month ?? ""}
                onChange={(e) => set("month", e.target.value === "" ? undefined : Number(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-line bg-surface px-3 py-2"
              >
                <option value="">Choose a month</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block">
            <span className="text-sm font-medium">How many days, including arrival and departure?</span>
            <input
              type="number"
              inputMode="numeric"
              min={3}
              max={60}
              value={Number.isNaN(input.days) ? "" : input.days}
              onChange={(e) => set("days", e.target.valueAsNumber)}
              className="mt-1 block w-full rounded-lg border border-line bg-surface px-3 py-2"
            />
          </label>
        </div>
      </Fieldset>

      <Fieldset legend="What do you love doing?" hint="Pick as many as you like. The more you pick, the more varied the route.">
        <div className="flex flex-wrap gap-2">
          {data.interests.map((interest) => (
            <Chip
              key={interest.id}
              checked={input.interests.includes(interest.id)}
              onChange={() => toggle("interests", interest.id)}
              title={interest.description}
            >
              {interest.name}
            </Chip>
          ))}
        </div>
      </Fieldset>

      <Fieldset legend="Any regions you want to focus on?" hint="Optional. Leave empty and we'll choose based on the season and your interests.">
        <div className="flex flex-wrap gap-2">
          {data.regions.map((region) => (
            <Chip key={region.id} checked={input.regions.includes(region.id)} onChange={() => toggle("regions", region.id)}>
              {region.name}
            </Chip>
          ))}
        </div>
      </Fieldset>

      <Fieldset legend="Pace">
        <OptionCards name="pace" options={PACES} value={input.pace} onChange={(v) => set("pace", v)} />
      </Fieldset>

      <Fieldset legend="Budget">
        <OptionCards name="budget" options={BUDGETS} value={input.budget} onChange={(v) => set("budget", v)} />
      </Fieldset>

      <Fieldset legend="Getting around">
        <OptionCards name="transport" options={TRANSPORT} value={input.transport} onChange={(v) => set("transport", v)} />
      </Fieldset>

      <label className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4">
        <input
          type="checkbox"
          checked={input.meetPeople}
          onChange={(e) => set("meetPeople", e.target.checked)}
          className="mt-1 size-4 accent-[var(--accent)]"
        />
        <span>
          <span className="font-medium">I&apos;d like to meet other travellers</span>
          <span className="block text-sm text-muted">We&apos;ll lean towards sociable places with hostels and group activities.</span>
        </span>
      </label>

      <div className="space-y-3">
        <p aria-live="polite" className="text-sm text-danger">
          {error}
        </p>
        <button
          type="submit"
          className="w-full rounded-lg bg-accent px-5 py-3 font-medium text-on-accent hover:opacity-90 sm:w-auto"
        >
          Build my route
        </button>
      </div>
    </form>
  );
}

function Fieldset({ legend, hint, children }: { legend: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="text-lg font-semibold">{legend}</legend>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className="mt-3">{children}</div>
    </fieldset>
  );
}

function Chip({ checked, onChange, title, children }: { checked: boolean; onChange: () => void; title?: string; children: ReactNode }) {
  return (
    <label
      title={title}
      className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
        checked ? "border-accent bg-accent text-on-accent" : "border-line bg-surface hover:bg-surface-sunken"
      }`}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      {children}
    </label>
  );
}

function OptionCards<T extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: { value: T; label: string; hint: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {options.map((o) => (
        <label
          key={o.value}
          className={`cursor-pointer rounded-xl border p-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
            value === o.value ? "border-accent bg-accent/10 ring-1 ring-accent" : "border-line bg-surface hover:bg-surface-sunken"
          }`}
        >
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
          <span className="font-medium">{o.label}</span>
          <span className="mt-1 block text-sm text-muted">{o.hint}</span>
        </label>
      ))}
    </div>
  );
}
