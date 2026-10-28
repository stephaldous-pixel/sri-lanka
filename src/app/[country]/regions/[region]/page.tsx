import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DestinationGrid } from "@/components/destination-card";
import { MonthLegend, MonthStrip } from "@/components/month-strip";
import { climateFor, destinationsInRegion, getCountry, getCountrySlugs, getRegion } from "@/content";
import { bestMonthsLabel } from "@/lib/format";
import { card } from "@/lib/ui";

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
      <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{region.name}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">{region.summary}</p>

      <section aria-labelledby="when-heading" className={`${card} mt-8 max-w-2xl p-5 sm:p-6`}>
        <h2 id="when-heading" className="text-xs font-medium uppercase tracking-wide text-muted">When to go</h2>
        <p className="mt-1 text-lg font-semibold">Best {bestMonthsLabel(region.months)}</p>
        <p className="mt-1 text-sm text-muted">{region.monthsNote}</p>
        <div className="mt-4">
          <MonthStrip months={region.months} label={`Best months for ${region.name}`} climate={climateFor(content, region)} />
        </div>
        <div className="mt-3">
          <MonthLegend />
        </div>
      </section>

      <section className="mt-12" aria-label="Places">
        <DestinationGrid content={content} destinations={destinationsInRegion(content, region.id)} />
      </section>

      <nav className="mt-20" aria-labelledby="more-heading">
        <h2 id="more-heading" className="text-sm font-medium text-muted">Other regions</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {otherRegions.map((r) => (
            <li key={r.id}>
              <Link href={`/${country.slug}/regions/${r.id}`} className="block rounded-full bg-surface-sunken px-4 py-1.5 text-sm hover:bg-line">
                {r.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
