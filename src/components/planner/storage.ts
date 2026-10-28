// Saves the traveller's answers in this browser only. Storage can be unavailable
// (private windows, blocked site data), so every call fails quietly.
import type { PlannerInput } from "@/planner/types";

type Saved = { input: PlannerInput; savedAt: string };

const key = (country: string) => `solo-planner:plan:${country}`;

export function loadSavedPlan(country: string): Saved | null {
  try {
    const raw = window.localStorage.getItem(key(country));
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

export function savePlan(country: string, input: PlannerInput): boolean {
  try {
    window.localStorage.setItem(key(country), JSON.stringify({ input, savedAt: new Date().toISOString() } satisfies Saved));
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
