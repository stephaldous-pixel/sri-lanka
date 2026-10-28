import { cacheLife } from "next/cache";

export type Rates = { base: string; updated: string; rates: Record<string, number> };

/** Exchange rates from 1 unit of `base`, refreshed at most once a day (free, no API key). */
export async function getRates(base: string): Promise<Rates | null> {
  "use cache";
  cacheLife("days");
  try {
    const response = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`);
    if (!response.ok) return null;
    const json = (await response.json()) as { result: string; time_last_update_utc: string; rates: Record<string, number> };
    if (json.result !== "success") return null;
    return { base, updated: json.time_last_update_utc, rates: json.rates };
  } catch {
    return null;
  }
}
