"use client";

import { useEffect, useRef, useState } from "react";
import { addDays, formatRange } from "@/lib/dates";
import { button } from "@/lib/ui";
import { ARRIVAL, fitToDays, generatePlan, planFromStops, PlannerError, toEditedRoute, type EditedRoute } from "@/planner/engine";
import type { PlannerData, PlannerInput, PlanResult } from "@/planner/types";
import { PlanResultView } from "./plan-result";
import { DEFAULT_INPUT, PlannerForm } from "./planner-form";
import { RouteEditor } from "./route-editor";
import { clearSavedPlan, loadSavedPlan, savePlan } from "./storage";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type Result = {
  view: "result";
  input: PlannerInput;
  plan: PlanResult;
  saved: boolean;
  /** The traveller's own arrangement, if they've edited the suggested route. */
  edits?: EditedRoute;
  editing: boolean;
};

type State = { view: "loading" } | { view: "form"; input: PlannerInput } | Result;

/** The route generator: questionnaire, then the suggested route, which can be edited. Everything runs in the browser. */
export function Planner({ data }: { data: PlannerData }) {
  const country = data.country.slug;
  const [state, setState] = useState<State>({ view: "loading" });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const resultTop = useRef<HTMLDivElement>(null);

  function build(input: PlannerInput, save: boolean, edits?: EditedRoute) {
    try {
      if (edits) edits = fitToDays(data, input, edits) ?? edits;
      const plan = edits ? planFromStops(data, input, edits) : generatePlan(data, input);
      setError(null);
      setState({ view: "result", input, plan, edits, editing: false, saved: save ? savePlan(country, input, edits) : true });
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
    if (!saved || !build(saved.input, false, saved.edits)) setState({ view: "form", input: saved?.input ?? DEFAULT_INPUT });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [country]);

  const isResult = state.view === "result";
  useEffect(() => {
    if (isResult) resultTop.current?.scrollIntoView({ block: "start" });
  }, [isResult]);

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

  const { input, plan, saved, edits, editing } = state;
  const days = plan.days.length;
  const when = input.startDate
    ? `· ${formatRange(input.startDate, addDays(input.startDate, days - 1))}`
    : input.month !== undefined
      ? `in ${MONTHS[input.month]}`
      : "";

  /**
   * Applies an edit while keeping the trip to the traveller's dates: nights are
   * moved between other stops. Returns false if it can't fit.
   */
  function applyEdits(next: EditedRoute, protect?: string, keepEditing = true): boolean {
    const fitted = fitToDays(data, input, next, protect);
    if (!fitted) return false;
    const plan = planFromStops(data, input, fitted);
    setState({ view: "result", input, plan, edits: fitted, editing: keepEditing, saved: savePlan(country, input, fitted) });
    return true;
  }

  /** Quick change from the route list: index is a position in plan.stops. */
  function changeNights(index: number, nights: number) {
    const current = edits ?? toEditedRoute(plan);
    const stop = plan.stops[index];
    const slug = stop.destination.slug;
    const ok =
      stop.role === "arrival"
        ? applyEdits({ ...current, arrivalNights: nights }, ARRIVAL, false)
        : applyEdits({ ...current, stops: current.stops.map((s) => (s.slug === slug ? { ...s, nights } : s)) }, slug, false);
    setNotice(
      ok
        ? `${stop.destination.name}: ${nights} night${nights === 1 ? "" : "s"}. Other stops adjusted to keep your ${input.days} days.`
        : "Every other stop is already down to 1 night. Remove a stop to make room, or change your dates.",
    );
  }

  function resetEdits() {
    const plan = generatePlan(data, input);
    setState({ view: "result", input, plan, edits: undefined, editing: true, saved: savePlan(country, input) });
  }

  return (
    <div ref={resultTop} data-plan-result className="scroll-mt-20 space-y-6 lg:mt-10">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Your {days}-day route {when}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {saved ? "Saved on this device." : "Couldn't save on this device (private browsing?)."}{" "}
            <button type="button" onClick={() => setState({ view: "form", input })} className={`${button.quiet} mr-3 sm:hidden`}>
              Change answers
            </button>
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
        <div className="hidden sm:block">
          <button type="button" onClick={() => setState({ view: "form", input })} className={button.secondary}>
            Change answers
          </button>
        </div>
      </div>
      <PlanResultView
        data={data}
        input={input}
        plan={plan}
        edited={!!edits}
        onEdit={() => setState({ ...state, editing: true })}
        onNights={changeNights}
        onPreferTrains={(prefer) => {
          build({ ...input, preferTrains: prefer }, true, edits);
          setNotice(prefer ? "Using trains where they run." : "Using the quickest option for each journey.");
        }}
        notice={editing ? undefined : notice}
        editor={
          editing ? (
            <RouteEditor
              plan={plan}
              data={data}
              input={input}
              edits={edits ?? toEditedRoute(plan)}
              days={days}
              onChange={(next, protect) => applyEdits(next, protect)}
              onDone={() => setState({ ...state, editing: false })}
              onReset={resetEdits}
            />
          ) : undefined
        }
      />
    </div>
  );
}
