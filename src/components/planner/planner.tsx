"use client";

import { useEffect, useRef, useState } from "react";
import { button } from "@/lib/ui";
import { generatePlan, PlannerError } from "@/planner/engine";
import type { PlannerData, PlannerInput, PlanResult } from "@/planner/types";
import { PlanResultView } from "./plan-result";
import { DEFAULT_INPUT, PlannerForm } from "./planner-form";
import { clearSavedPlan, loadSavedPlan, savePlan } from "./storage";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

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
    if (state.view === "result") resultTop.current?.scrollIntoView({ block: "start" });
  }, [state.view]);

  if (state.view === "loading") {
    return <div className="mt-8 h-96 animate-pulse rounded-2xl bg-surface-sunken" aria-label="Loading" />;
  }

  if (state.view === "form") {
    return (
      <>
        {error && (
          <p role="alert" className="mt-6 rounded-xl bg-danger/10 p-3 text-sm text-danger">
            {error}
          </p>
        )}
        <PlannerForm data={data} initial={state.input} onSubmit={(input) => build(input, true)} />
      </>
    );
  }

  const { input, plan, saved } = state;
  const when = input.startDate
    ? `from ${new Date(`${input.startDate}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" })}`
    : input.month !== undefined
      ? `in ${MONTHS[input.month]}`
      : "";

  return (
    <div ref={resultTop} className="mt-10 scroll-mt-20 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Your {input.days}-day route {when}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {saved ? "Saved on this device." : "Couldn't save on this device (private browsing?)."}{" "}
            <button
              type="button"
              onClick={() => {
                clearSavedPlan(country);
                setState({ view: "form", input: DEFAULT_INPUT });
              }}
              className={button.quiet}
            >
              Start over
            </button>
          </p>
        </div>
        <button type="button" onClick={() => setState({ view: "form", input })} className={button.secondary}>
          Change answers
        </button>
      </div>
      <PlanResultView data={data} input={input} plan={plan} />
    </div>
  );
}
