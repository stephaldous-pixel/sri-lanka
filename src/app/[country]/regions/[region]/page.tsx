import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DestinationGrid } from "@/components/destination-card";
import { MonthLegend, MonthStrip } from "@/components/month-strip";
import { destinationsInRegion, getCountry, getCountrySlugs, getRegion } from "@/content";

export function generateStaticParams() {
  return getCountrySlugs().flatMap((country) =>
    getCountry(country)!.regions.map((region) => ({ country, region: region.id })),
  );
}

async function load(params: PageProps<"/[country]/regions/[region]">["params"]) {
  const { country, region } = await params;
  const content = getCountry(country);
  const found = content && getRegion(content, region);
  return content && found ? { content, region: found } : undefined;
}

export async function generateMetadata({ params }: PageProps<"/[country]/regions/[region]">): Promise<Metadata> {
  const data = await load(params);
  return data ? { title: `${data.region.name}, ${data.content.country.name}`, description: data.region.summary } : {};
}

export default async function RegionPage({ params }: PageProps<"/[country]/regions/[region]">) {
  const data = await load(params);
  if (!data) notFound();
  const { content, region } = data;
  const { country } = content;
  const otherRegions = content.regions.filter((r) => r.id !== region.id);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: `/${country.slug}`, label: country.name }, { label: region.name }]} />
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{region.name}</h1>
      <p className="mt-2 max-w-2xl text-lg text-muted">{region.summary}</p>

      <section className="mt-8 max-w-3xl rounded-xl border border-line bg-surface p-5" aria-labelledby="when-heading">
        <h2 id="when-heading" className="font-semibold">When to go</h2>
        <div className="mt-3">
          <MonthStrip months={region.months} label={`Best months for ${region.name}`} />
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">{region.monthsNote}</p>
          <MonthLegend />
        </div>
      </section>

      <section className="mt-10" aria-labelledby="places-heading">
        <h2 id="places-heading" className="mb-4 text-2xl font-semibold tracking-tight">Places to go</h2>
        <DestinationGrid countrySlug={country.slug} destinations={destinationsInRegion(content, region.id)} />
      </section>

      <nav className="mt-12" aria-labelledby="more-heading">
        <h2 id="more-heading" className="text-sm font-medium uppercase tracking-wide text-muted">
          Other regions
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {otherRegions.map((r) => (
            <li key={r.id}>
              <Link
                href={`/${country.slug}/regions/${r.id}`}
                className="block rounded-full border border-line px-3 py-1 text-sm hover:bg-surface-sunken"
              >
                {r.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
