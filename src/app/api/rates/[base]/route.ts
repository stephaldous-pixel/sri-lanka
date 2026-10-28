import { getCountry, getCountrySlugs } from "@/content";
import { getRates } from "@/lib/rates";

/** One set of rates per country currency, e.g. /api/rates/LKR. */
export function generateStaticParams() {
  return [...new Set(getCountrySlugs().map((slug) => getCountry(slug)!.country.currency.code))].map((base) => ({ base }));
}

export async function GET(_request: Request, { params }: RouteContext<"/api/rates/[base]">) {
  const { base } = await params;
  if (!/^[A-Z]{3}$/.test(base)) return Response.json({ error: "Unknown currency" }, { status: 400 });
  const rates = await getRates(base);
  if (!rates) return Response.json({ error: "Rates unavailable" }, { status: 503 });
  return Response.json(rates);
}
