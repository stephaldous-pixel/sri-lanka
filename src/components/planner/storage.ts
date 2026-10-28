// Saves the traveller's answers (and any route edits) in this browser only.
// Storage can be unavailable (private windows, blocked site data), so every
// call fails quietly.
import type { EditedRoute } from "@/planner/engine";
import type { PlannerInput } from "@/planner/types";

export type SavedPlan = { input: PlannerInput; edits?: EditedRoute; savedAt: string };

const key = (country: string) => `solo-planner:plan:${country}`;

export function loadSavedPlan(country: string): SavedPlan | null {
  try {
    const raw = window.localStorage.getItem(key(country));
    return raw ? (JSON.parse(raw) as SavedPlan) : null;
  } catch {
    return null;
  }
}

export function savePlan(country: string, input: PlannerInput, edits?: EditedRoute): boolean {
  try {
    window.localStorage.setItem(key(country), JSON.stringify({ input, edits, savedAt: new Date().toISOString() } satisfies SavedPlan));
    return true;
  } catch {
    return false;
  }
}

export function clearSavedPlan(country: string): void {
  try {
    window.localStorage.removeItem(key(country));
  } catch {
    // Nothing to clear.
  }
}
