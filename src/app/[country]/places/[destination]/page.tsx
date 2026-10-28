import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Price } from "@/components/currency";
import { Disclosure } from "@/components/disclosure";
import { Markdown } from "@/components/markdown";
import { MonthLegend, MonthStrip } from "@/components/month-strip";
import { Photo } from "@/components/photo";
import { SocialBadge } from "@/components/social-badge";
import { TravelOptions } from "@/components/travel-options";
import { climateFor, connectionsFrom, getCountry, getCountrySlugs, getDestination, getInterest, getRegion, monthsFor } from "@/content";
import { bestMonthsLabel, formatDate, formatHours, nightsLabel } from "@/lib/format";
import { button, card } from "@/lib/ui";

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
  const climate = climateFor(content, d);
  const connections = connectionsFrom(content, d.slug);
  const { code, symbol } = country.currency;
  const topInterests = Object.entries(d.interests)
    .filter(([, strength]) => strength >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([id]) => getInterest(id)!.name);
  const quickest = (options: (typeof connections)[number]["leg"]["options"]) =>
    Math.min(...options.filter((o) => o.status !== "suspended").map((o) => o.hours));

  return (
    <main>
      <section className="relative isolate">
        <Photo photo={d.photo} sizes="100vw" priority className="h-[48vh] min-h-80 w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto w-full max-w-3xl px-4 pb-8 text-white sm:px-6">
            <p className="text-sm text-white/80">
              <Link href={`/${country.slug}/regions/${region.id}`} className="hover:underline">
                {region.name}
              </Link>
            </p>
            <h1 className="mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">{d.name}</h1>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <Breadcrumbs
          items={[
            { href: `/${country.slug}`, label: country.name },
            { href: `/${country.slug}/regions/${region.id}`, label: region.name },
            { label: d.name },
          ]}
        />
        <p className="mt-6 text-xl leading-relaxed">{d.summary}</p>
        {topInterests.length > 0 && <p className="mt-3 text-sm text-muted">Great for {topInterests.join(" · ")}</p>}

        <section aria-labelledby="facts-heading" className={`${card} mt-8 p-5 sm:p-6`}>
          <h2 id="facts-heading" className="sr-only">At a glance</h2>
          <dl className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">Best time to go</dt>
              <dd className="mt-1">
                <span className="text-lg font-semibold">{bestMonthsLabel(months) || "Check the months below"}</span>
                <div className="mt-3">
                  <MonthStrip months={months} label={`Best months for ${d.name}`} climate={climate} />
                </div>
                {note && <p className="mt-2 text-sm text-muted">{note}</p>}
                <div className="mt-3">
                  <MonthLegend />
                </div>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">How long</dt>
              <dd className="mt-1 font-medium">{nightsLabel(d.nights)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">Budget stay, per night</dt>
              <dd className="mt-1 font-medium">
                <Price amount={d.stay.budget} code={code} symbol={symbol} />
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">Meeting people</dt>
              <dd className="mt-1">
                <SocialBadge level={d.solo.social} />
              </dd>
            </div>
          </dl>
        </section>

        <Markdown className="mt-10 text-lg">{d.description}</Markdown>

        <section className="mt-12" aria-labelledby="highlights-heading">
          <h2 id="highlights-heading" className="text-2xl font-semibold tracking-tight">Highlights</h2>
          <ul className="mt-4 divide-y divide-line">
            {d.highlights.map((h) => (
              <li key={h.name} className="py-4">
                <h3 className="font-semibold">{h.name}</h3>
                <p className="mt-0.5 text-muted">{h.summary}</p>
                {h.cost && (
                  <p className="mt-1.5 text-sm">
                    <Price amount={h.cost} code={code} symbol={symbol} className="font-medium" />
                  </p>
                )}
                {h.costNote && <p className="mt-0.5 text-xs text-muted">{h.costNote}</p>}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12 border-t border-line" aria-label="More details">
          <Disclosure summary="Travelling solo: safety & tips">
            <p>{d.solo.socialNotes}</p>
            <h3 className="mt-5 text-sm font-semibold">Staying safe</h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
              {d.solo.safety.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <h3 className="mt-5 text-sm font-semibold">Tips</h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
              {d.solo.tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </Disclosure>

          <Disclosure summary="Getting there & around">
            <p>{d.gettingAround}</p>
            {connections.length > 0 && (
              <ul aria-label={`Direct connections from ${d.name}`} className="mt-4 divide-y divide-line text-sm">
                {connections.map(({ destination: to, leg }) => (
                  <li key={to.slug} className="py-3">
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                        <span className="font-medium">{to.name}</span>
                        <span className="text-muted">
                          from {formatHours(quickest(leg.options))}
                          {leg.options.some((o) => o.status !== "running") && <span className="ml-1.5 text-warning">⚠</span>}
                        </span>
                      </summary>
                      <div className="mt-3 rounded-xl bg-surface-sunken p-3">
                        <TravelOptions options={leg.options} />
                        <Link href={`/${country.slug}/places/${to.slug}`} className="mt-2 inline-block text-accent hover:underline">
                          About {to.name} →
                        </Link>
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted">Typical door-to-door times. Train status checked {formatDate(content.legsLastChecked)}.</p>
          </Disclosure>

          <Disclosure summary="Where to stay: prices">
            <p className="text-sm text-muted">Per night for one person.</p>
            <dl className="mt-3 space-y-2 text-sm">
              {(
                [
                  ["Budget", d.stay.budget],
                  ["Mid-range", d.stay.mid],
                  ["Comfort", d.stay.comfort],
                ] as const
              ).map(([label, range]) => (
                <div key={label} className="flex flex-wrap justify-between gap-x-4">
                  <dt className="text-muted">{label}</dt>
                  <dd className="font-medium">
                    <Price amount={range} code={code} symbol={symbol} />
                  </dd>
                </div>
              ))}
            </dl>
            {d.stay.note && <p className="mt-3 text-xs text-muted">{d.stay.note}</p>}
          </Disclosure>


          <Disclosure summary={<span className="text-sm text-muted">Sources · checked {formatDate(d.lastChecked)}</span>}>
            <ul className="space-y-1 text-sm">
              {d.sources.map((s) => (
                <li key={s} className="break-all">
                  <a href={s} className="text-muted underline" target="_blank" rel="noopener noreferrer">
                    {s}
                  </a>
                </li>
              ))}
            </ul>
          </Disclosure>
        </section>

        <div className={`${card} mt-12 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between`}>
          <p className="font-medium">Want {d.name} in a route that fits your dates?</p>
          <Link href={`/${country.slug}/plan`} className={button.primary}>
            Plan my route
          </Link>
        </div>
      </div>
    </main>
  );
}
