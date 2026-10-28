"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/** Currencies offered in the picker. */
export const CURRENCIES = [
  ["GBP", "British pound"],
  ["USD", "US dollar"],
  ["EUR", "Euro"],
  ["AUD", "Australian dollar"],
  ["CAD", "Canadian dollar"],
  ["NZD", "New Zealand dollar"],
  ["INR", "Indian rupee"],
  ["SGD", "Singapore dollar"],
  ["CHF", "Swiss franc"],
  ["SEK", "Swedish krona"],
  ["NOK", "Norwegian krone"],
  ["DKK", "Danish krone"],
  ["JPY", "Japanese yen"],
  ["CNY", "Chinese yuan"],
  ["AED", "UAE dirham"],
  ["ZAR", "South African rand"],
] as const;

/** Guess from the browser's language, e.g. en-GB → GBP. */
const BY_REGION: Record<string, string> = {
  GB: "GBP", US: "USD", AU: "AUD", CA: "CAD", NZ: "NZD", IN: "INR", SG: "SGD", CH: "CHF", SE: "SEK",
  NO: "NOK", DK: "DKK", JP: "JPY", CN: "CNY", AE: "AED", ZA: "ZAR", IE: "EUR", DE: "EUR", FR: "EUR",
  ES: "EUR", IT: "EUR", NL: "EUR", BE: "EUR", AT: "EUR", PT: "EUR", FI: "EUR",
};

const STORAGE_KEY = "solo-planner:currency";

type CurrencyState = {
  home: string;
  setHome: (code: string) => void;
  /** Converts an amount in `from` to the home currency, or null if no rate yet. */
  convert: (amount: number, from: string) => number | null;
  /** Fetches rates for `base` if they haven't been loaded. */
  ensureRates: (base: string) => void;
};

const CurrencyContext = createContext<CurrencyState>({ home: "GBP", setHome: () => {}, convert: () => null, ensureRates: () => {} });

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [home, setHomeState] = useState("GBP");
  const [rates, setRates] = useState<Record<string, Record<string, number>>>({});

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(STORAGE_KEY);
    } catch {}
    const region = navigator.language.split("-")[1]?.toUpperCase();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser preferences after mount
    setHomeState(saved ?? (region && BY_REGION[region]) ?? "USD");
  }, []);

  const setHome = (code: string) => {
    setHomeState(code);
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {}
  };

  const ensureRates = (base: string) => {
    if (base in rates) return;
    setRates((r) => ({ ...r, [base]: {} })); // mark as loading
    fetch(`/api/rates/${base}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => json && setRates((r) => ({ ...r, [base]: json.rates })))
      .catch(() => {});
  };

  const convert = (amount: number, from: string) => {
    if (from === home) return amount;
    const rate = rates[from]?.[home];
    return rate ? amount * rate : null;
  };

  return <CurrencyContext.Provider value={{ home, setHome, convert, ensureRates }}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

export function CurrencyPicker({ className = "" }: { className?: string }) {
  const { home, setHome } = useCurrency();
  // The native select stays invisible on top, so it opens the phone's own picker,
  // while the visible pill shows just the short code.
  return (
    <label className={`relative inline-flex h-10 items-center rounded-full bg-surface-sunken pr-6 pl-3 text-sm font-medium ring-1 ring-line hover:bg-line has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${className}`}>
      <span aria-hidden="true">{home}</span>
      <span aria-hidden="true" className="pointer-events-none absolute right-2.5 text-xs text-muted">
        ▾
      </span>
      <select
        aria-label="Show prices in"
        value={home}
        onChange={(e) => setHome(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {CURRENCIES.map(([code, name]) => (
          <option key={code} value={code}>
            {code} · {name}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatMoney(amount: number, code: string) {
  // Whole units read best ("£6–14"); keep pence/cents only for tiny amounts like a cup of tea.
  const digits = amount >= 1 || code === "JPY" ? 0 : 2;
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: code, maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(amount);
}

function formatLocal(amount: number, symbol: string) {
  return `${symbol} ${Math.round(amount).toLocaleString("en-GB")}`;
}

/**
 * A price in the local currency with the traveller's own currency alongside,
 * e.g. "Rs 5,000 · £12". Pass a single amount or a [min, max] range.
 */
export function Price({
  amount,
  code,
  symbol,
  className = "",
}: {
  amount: number | [number, number];
  code: string;
  symbol: string;
  className?: string;
}) {
  const { home, convert, ensureRates } = useCurrency();
  useEffect(() => {
    if (home !== code) ensureRates(code);
  }, [home, code, ensureRates]);
  const [min, max] = Array.isArray(amount) ? amount : [amount, amount];
  const local = min === max ? formatLocal(min, symbol) : `${formatLocal(min, symbol)}–${Math.round(max).toLocaleString("en-GB")}`;
  const cMin = home === code ? null : convert(min, code);
  const cMax = home === code ? null : convert(max, code);
  const converted =
    cMin === null || cMax === null
      ? null
      : min === max
        ? formatMoney(cMin, home)
        : `${formatMoney(cMin, home)}–${formatMoney(cMax, home).replace(/^[^\d]+/, "")}`;

  return (
    <span className={className}>
      <span className="whitespace-nowrap">{local}</span>
      {converted && <span className="whitespace-nowrap text-muted"> · {converted}</span>}
    </span>
  );
}
