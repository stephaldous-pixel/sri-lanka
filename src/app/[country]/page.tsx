import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Disclosure } from "@/components/disclosure";
import { MonthLegend, MonthStrip } from "@/components/month-strip";
import { Photo } from "@/components/photo";
import { climateFor, destinationsInRegion, getCountry } from "@/content";
import { bestMonthsLabel } from "@/lib/format";
import { button } from "@/lib/ui";

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
      <section className="relative isolate">
        <Photo photo={country.photo} sizes="100vw" priority className="h-[52vh] min-h-80 w-full sm:h-[62vh] sm:min-h-96" />
        <div className="absolute inset-0 -z-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto w-full max-w-6xl px-4 pb-10 text-white sm:px-6 sm:pb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">Solo travel guide</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-6xl">{country.name}</h1>
            <p className="mt-3 max-w-xl text-lg text-white/90">{country.tagline}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`/${country.slug}/plan`} className={button.primary}>
                Plan my route
              </Link>
              <Link
                href={`/${country.slug}/guide`}
                className="inline-flex items-center rounded-full bg-white/15 px-5 py-2.5 text-sm font-medium text-white ring-1 ring-white/30 backdrop-blur hover:bg-white/25"
              >
                Practical guide
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <section className="mt-10 sm:mt-16" aria-labelledby="regions-heading">
          <h2 id="regions-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Explore by region
          </h2>
          <p className="mt-2 text-muted">{content.destinations.length} places in {regions.length} regions.</p>
          <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 sm:mt-8 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-4">
            {regions.map((region) => {
              const places = destinationsInRegion(content, region.id);
              const cover = places.find((d) => d.photo)?.photo;
              return (
                <Link key={region.id} href={`/${country.slug}/regions/${region.id}`} className="group block">
                  <Photo photo={cover} sizes="(min-width: 1024px) 25vw, 50vw" showCredit={false} className="aspect-square w-full rounded-xl transition group-hover:opacity-90 sm:aspect-[4/3] sm:rounded-2xl" />
                  <div className="mt-2 sm:mt-3 sm:flex sm:items-baseline sm:justify-between sm:gap-3">
                    <h3 className="text-[0.9375rem] font-semibold leading-snug group-hover:text-accent sm:text-base">{region.name}</h3>
                    <span className="mt-0.5 block text-xs text-muted sm:mt-0 sm:shrink-0">Best {bestMonthsLabel(region.months)}</span>
                  </div>
                  <p className="mt-1 hidden text-sm text-muted sm:line-clamp-2">{region.summary}</p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-20" aria-labelledby="when-heading">
          <h2 id="when-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">When to go</h2>
          <p className="mt-2 max-w-2xl text-muted">
            Two monsoons hit opposite sides of the island, so somewhere is always in season. December to
            April suits the south, west and hills; May to September suits the east and north.
          </p>
          <Disclosure className="mt-4 border-t" summary="Month by month for every region">
            <ul className="space-y-3">
              {regions.map((region) => (
                <li key={region.id} className="grid gap-1.5 sm:grid-cols-[11rem_1fr] sm:items-start">
                  <span className="text-sm font-medium">{region.name}</span>
                  <MonthStrip months={region.months} label={`Best months for ${region.name}`} climate={climateFor(content, region)} compact />
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <MonthLegend />
            </div>
          </Disclosure>
        </section>

        <section className="mt-20" aria-labelledby="guide-heading">
          <h2 id="guide-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">Before you go</h2>
          <ul className="mt-6 grid gap-x-10 sm:grid-cols-2">
            {country.guide.map((section) => (
              <li key={section.id} className="border-b border-line">
                <Link href={`/${country.slug}/guide#${section.id}`} className="group flex items-center justify-between gap-4 py-4">
                  <span>
                    <span className="font-medium group-hover:text-accent">{section.title}</span>
                    <span className="block text-sm text-muted">{section.summary}</span>
                  </span>
                  <span aria-hidden="true" className="text-muted transition group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
