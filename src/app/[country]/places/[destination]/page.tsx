import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Markdown } from "@/components/markdown";
import { MonthLegend, MonthStrip } from "@/components/month-strip";
import { Photo } from "@/components/photo";
import { SocialBadge } from "@/components/social-badge";
import { TravelOptions } from "@/components/travel-options";
import { connectionsFrom, getCountry, getCountrySlugs, getDestination, getInterest, getRegion, monthsFor } from "@/content";
import { formatDate, formatPriceRange, nightsLabel } from "@/lib/format";

export function generateStaticParams() {
  return getCountrySlugs().flatMap((country) =>
    getCountry(country)!.destinations.map((d) => ({ country, destination: d.slug })),
  );
}

async function load(params: PageProps<"/[country]/places/[destination]">["params"]) {
  const { country, destination } = await params;
  const content = getCountry(country);
  const found = content && getDestination(content, destination);
  return content && found ? { content, destination: found } : undefined;
}

export async function generateMetadata({ params }: PageProps<"/[country]/places/[destination]">): Promise<Metadata> {
  const data = await load(params);
  return data
    ? { title: `${data.destination.name}, ${data.content.country.name}`, description: data.destination.summary }
    : {};
}

export default async function DestinationPage({ params }: PageProps<"/[country]/places/[destination]">) {
  const data = await load(params);
  if (!data) notFound();
  const { content, destination: d } = data;
  const { country } = content;
  const region = getRegion(content, d.region)!;
  const { months, note } = monthsFor(content, d);
  const connections = connectionsFrom(content, d.slug);
  const symbol = country.currency.symbol;
  const interests = Object.entries(d.interests)
    .sort(([, a], [, b]) => b - a)
    .map(([id, strength]) => ({ interest: getInterest(id)!, strength }));

  return (
    <main>
      <Photo photo={d.photo} sizes="100vw" priority className="h-56 w-full sm:h-80 lg:h-[26rem]" />

      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <Breadcrumbs
          items={[
            { href: `/${country.slug}`, label: country.name },
            { href: `/${country.slug}/regions/${region.id}`, label: region.name },
            { label: d.name },
          ]}
        />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{d.name}</h1>
        <p className="mt-2 max-w-2xl text-lg text-muted">{d.summary}</p>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Good for">
          {interests.map(({ interest, strength }) => (
            <li
              key={interest.id}
              className={`rounded-full px-3 py-1 text-sm ${
                strength === 3 ? "bg-accent text-on-accent" : "border border-line text-muted"
              }`}
            >
              {interest.name}
            </li>
          ))}
        </ul>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem]">
          <div className="min-w-0 space-y-12">
            <section aria-labelledby="about-heading">
              <h2 id="about-heading" className="sr-only">About {d.name}</h2>
              <Markdown className="max-w-3xl text-lg">{d.description}</Markdown>
            </section>

            <section aria-labelledby="highlights-heading">
              <h2 id="highlights-heading" className="text-2xl font-semibold tracking-tight">Highlights</h2>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {d.highlights.map((h) => (
                  <li key={h.name} className="rounded-xl border border-line bg-surface p-4">
                    <h3 className="font-semibold">{h.name}</h3>
                    <p className="mt-1 text-sm text-muted">{h.summary}</p>
                    {(h.cost || h.costNote) && (
                      <p className="mt-3 text-sm">
                        {h.cost && <span className="font-medium">{formatPriceRange(h.cost, symbol)}</span>}
                        {h.cost && h.costNote && " · "}
                        {h.costNote && <span className="text-muted">{h.costNote}</span>}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="solo-heading">
              <h2 id="solo-heading" className="text-2xl font-semibold tracking-tight">Travelling solo</h2>
              <div className="mt-3">
                <SocialBadge level={d.solo.social} />
              </div>
              <p className="mt-2 max-w-3xl">{d.solo.socialNotes}</p>
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold">Staying safe</h3>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
                    {d.solo.safety.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold">Tips</h3>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
                    {d.solo.tips.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section aria-labelledby="getting-heading">
              <h2 id="getting-heading" className="text-2xl font-semibold tracking-tight">Getting there & around</h2>
              <p className="mt-3 max-w-3xl">{d.gettingAround}</p>
              {connections.length > 0 && (
                <ul
                  aria-label={`Direct connections from ${d.name}`}
                  className="mt-5 divide-y divide-line rounded-xl border border-line bg-surface text-sm"
                >
                  {connections.map(({ destination: to, leg }) => (
                    <li key={to.slug} className="grid gap-2 p-4 sm:grid-cols-[12rem_1fr] sm:gap-4">
                      <div>
                        <Link href={`/${country.slug}/places/${to.slug}`} className="font-medium hover:text-accent hover:underline">
                          {to.name}
                        </Link>
                        {leg.distanceKm && <div className="text-xs text-muted">{leg.distanceKm} km</div>}
                      </div>
                      <TravelOptions options={leg.options} />
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs text-muted">
                Typical door-to-door times. Train status last checked {formatDate(content.legsLastChecked)}.
              </p>
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <section className="rounded-xl border border-line bg-surface p-5" aria-labelledby="when-heading">
              <h2 id="when-heading" className="font-semibold">When to go</h2>
              <div className="mt-3">
                <MonthStrip months={months} label={`Best months for ${d.name}`} compact />
              </div>
              {note && <p className="mt-3 text-sm text-muted">{note}</p>}
              <div className="mt-3">
                <MonthLegend />
              </div>
            </section>

            <section className="rounded-xl border border-line bg-surface p-5" aria-labelledby="time-heading">
              <h2 id="time-heading" className="font-semibold">How long</h2>
              <p className="mt-2 text-sm">{nightsLabel(d.nights)}</p>
            </section>

            <section className="rounded-xl border border-line bg-surface p-5" aria-labelledby="stay-heading">
              <h2 id="stay-heading" className="font-semibold">Where to stay</h2>
              <p className="mt-1 text-xs text-muted">Per night for one person</p>
              <dl className="mt-3 space-y-2 text-sm">
                {(
                  [
                    ["Budget", d.stay.budget],
                    ["Mid-range", d.stay.mid],
                    ["Comfort", d.stay.comfort],
                  ] as const
                ).map(([label, range]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-muted">{label}</dt>
                    <dd className="font-medium">{formatPriceRange(range, symbol)}</dd>
                  </div>
                ))}
              </dl>
              {d.stay.note && <p className="mt-3 text-xs text-muted">{d.stay.note}</p>}
            </section>

            <details className="text-sm text-muted">
              <summary className="cursor-pointer">Sources · last checked {formatDate(d.lastChecked)}</summary>
              <ul className="mt-2 space-y-1">
                {d.sources.map((s) => (
                  <li key={s} className="break-all">
                    <a href={s} className="underline" target="_blank" rel="noopener noreferrer">
                      {s}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          </aside>
        </div>
      </div>
    </main>
  );
}
