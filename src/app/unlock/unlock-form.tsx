"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { unlock, type UnlockState } from "./actions";

const initialState: UnlockState = { error: null };

export function UnlockForm() {
  const next = useSearchParams().get("next") ?? "/";
  const [state, formAction, pending] = useActionState(unlock, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <label htmlFor="password" className="text-sm font-medium">
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        required
        autoFocus
        autoComplete="current-password"
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? "password-error" : undefined}
        className="rounded-lg border border-line bg-surface px-3 py-2 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
      />
      {state.error && (
        <p id="password-error" role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-accent px-4 py-2 font-medium text-on-accent transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Checking…" : "Enter"}
      </button>
    </form>
  );
}
