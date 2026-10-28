import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DestinationGrid } from "@/components/destination-card";
import { MonthLegend, MonthStrip } from "@/components/month-strip";
import { Photo } from "@/components/photo";
import { destinationsInRegion, getCountry } from "@/content";

export async function generateMetadata({ params }: PageProps<"/[country]">): Promise<Metadata> {
  const content = getCountry((await params).country);
  return content ? { title: `${content.country.name} for solo travellers`, description: content.country.tagline } : {};
}

export default async function CountryPage({ params }: PageProps<"/[country]">) {
  const content = getCountry((await params).country);
  if (!content) notFound();
  const { country, regions } = content;

  return (
    <main>
      <section className="relative">
        <Photo photo={country.photo} sizes="100vw" priority className="h-64 w-full sm:h-96" />
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="-mt-16 relative max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-sm sm:-mt-24 sm:p-8">
            <p className="text-sm font-medium uppercase tracking-wide text-accent">Solo travel guide</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{country.name}</h1>
            <p className="mt-3 text-lg text-muted">{country.tagline}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={`/${country.slug}/guide`}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:opacity-90"
              >
                Practical guide
              </Link>
              <a href="#regions" className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-surface-sunken">
                Browse {content.destinations.length} destinations
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <section className="mt-12" aria-labelledby="when-heading">
          <h2 id="when-heading" className="text-2xl font-semibold tracking-tight">When to go</h2>
          <p className="mt-2 max-w-2xl text-muted">
            Two monsoons hit opposite sides of the island, so somewhere is always in season.
          </p>
          <div className="mt-5 overflow-hidden rounded-xl border border-line bg-surface">
            <ul className="divide-y divide-line">
              {regions.map((region) => (
                <li key={region.id} className="grid gap-2 p-4 sm:grid-cols-[12rem_1fr] sm:items-center">
                  <Link href={`/${country.slug}/regions/${region.id}`} className="font-medium hover:text-accent hover:underline">
                    {region.name}
                  </Link>
                  <MonthStrip months={region.months} label={`Best months for ${region.name}`} compact />
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-3">
            <MonthLegend />
          </div>
        </section>

        <section id="regions" className="mt-14 scroll-mt-6" aria-labelledby="regions-heading">
          <h2 id="regions-heading" className="text-2xl font-semibold tracking-tight">Where to go</h2>
          {regions.map((region) => (
            <section key={region.id} className="mt-10" aria-labelledby={`region-${region.id}`}>
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h3 id={`region-${region.id}`} className="text-xl font-semibold">
                    <Link href={`/${country.slug}/regions/${region.id}`} className="hover:text-accent hover:underline">
                      {region.name}
                    </Link>
                  </h3>
                  <p className="text-muted">{region.summary}</p>
                </div>
              </div>
              <DestinationGrid countrySlug={country.slug} destinations={destinationsInRegion(content, region.id)} />
            </section>
          ))}
        </section>

        <section className="mt-14" aria-labelledby="guide-heading">
          <h2 id="guide-heading" className="text-2xl font-semibold tracking-tight">Before you go</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {country.guide.map((section) => (
              <Link
                key={section.id}
                href={`/${country.slug}/guide#${section.id}`}
                className="rounded-xl border border-line bg-surface p-4 hover:shadow-md"
              >
                <h3 className="font-semibold">{section.title}</h3>
                <p className="mt-1 text-sm text-muted">{section.summary}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
