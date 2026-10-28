"use client";

import { useEffect, useRef, useState } from "react";
import { generatePlan, PlannerError } from "@/planner/engine";
import type { PlannerData, PlannerInput, PlanResult } from "@/planner/types";
import { PlanResultView } from "./plan-result";
import { DEFAULT_INPUT, PlannerForm } from "./planner-form";
import { clearSavedPlan, loadSavedPlan, savePlan } from "./storage";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type State =
  | { view: "loading" }
  | { view: "form"; input: PlannerInput }
  | { view: "result"; input: PlannerInput; plan: PlanResult; saved: boolean };

/** The route generator: questionnaire, then the suggested route. Everything runs in the browser. */
export function Planner({ data }: { data: PlannerData }) {
  const country = data.country.slug;
  const [state, setState] = useState<State>({ view: "loading" });
  const [error, setError] = useState<string | null>(null);
  const resultTop = useRef<HTMLDivElement>(null);

  function build(input: PlannerInput, save: boolean) {
    try {
      const plan = generatePlan(data, input);
      setError(null);
      setState({ view: "result", input, plan, saved: save ? savePlan(country, input) : true });
      return true;
    } catch (e) {
      setError(e instanceof PlannerError ? e.message : "Something went wrong building your route. Please try again.");
      setState({ view: "form", input });
      return false;
    }
  }

  // Bring back a route saved on this device, if there is one.
  useEffect(() => {
    const saved = loadSavedPlan(country);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage after mount
    if (!saved || !build(saved.input, false)) setState({ view: "form", input: saved?.input ?? DEFAULT_INPUT });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [country]);

  useEffect(() => {
    if (state.view === "result") resultTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [state.view]);

  if (state.view === "loading") {
    return <p className="mt-8 text-muted">Loading…</p>;
  }

  if (state.view === "form") {
    return (
      <>
        {error && (
          <p role="alert" className="mt-6 rounded-lg border border-danger/40 p-3 text-sm text-danger">
            {error}
          </p>
        )}
        <PlannerForm data={data} initial={state.input} onSubmit={(input) => build(input, true)} />
      </>
    );
  }

  const { input, plan, saved } = state;
  const interestNames = input.interests.map((id) => data.interests.find((i) => i.id === id)?.name ?? id);
  return (
    <div ref={resultTop} className="mt-8 scroll-mt-6 space-y-8">
      <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface-sunken p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <p className="font-medium">
            {input.days} days{" "}
            {input.startDate
              ? `from ${new Date(`${input.startDate}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}`
              : input.month !== undefined
                ? `in ${MONTHS[input.month]}`
                : ""}
          </p>
          <p className="text-muted">{interestNames.join(", ")}</p>
          <p className="mt-1 text-xs text-muted">{saved ? "Saved on this device." : "Couldn't save on this device (private browsing?)."}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setState({ view: "form", input })}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:opacity-90"
          >
            Change answers
          </button>
          <button
            type="button"
            onClick={() => {
              clearSavedPlan(country);
              setState({ view: "form", input: DEFAULT_INPUT });
            }}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-surface"
          >
            Start over
          </button>
        </div>
      </div>
      <PlanResultView data={data} input={input} plan={plan} />
    </div>
  );
}
