import Link from "next/link";
import { Photo } from "@/components/photo";
import { getCountry, getCountrySlugs } from "@/content";
import { SITE_TAGLINE } from "@/lib/site";

export default function Home() {
  const countries = getCountrySlugs().map((slug) => getCountry(slug)!);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
      <section className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{SITE_TAGLINE}</h1>
        <p className="mt-4 text-lg text-muted">
          Guides written for people travelling alone: where it&apos;s easy to meet others, how to get
          around safely, and what things really cost for one. Tell us what you love doing and
          we&apos;ll suggest a route that fits the season.
        </p>
        <Link
          href="/sri-lanka/plan"
          className="mt-6 inline-block rounded-lg bg-accent px-5 py-3 font-medium text-on-accent hover:opacity-90"
        >
          Plan a Sri Lanka trip
        </Link>
      </section>

      <section className="mt-12" aria-labelledby="countries-heading">
        <h2 id="countries-heading" className="text-sm font-medium uppercase tracking-wide text-muted">
          Destinations
        </h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          {countries.map(({ country, destinations }) => (
            <Link
              key={country.slug}
              href={`/${country.slug}`}
              className="group overflow-hidden rounded-2xl border border-line bg-surface transition-shadow hover:shadow-md"
            >
              <Photo
                photo={country.photo}
                sizes="(min-width: 768px) 50vw, 100vw"
                className="aspect-[16/9] w-full"
                priority
                showCredit={false}
              />
              <div className="p-5">
                <h3 className="text-xl font-semibold group-hover:underline">{country.name}</h3>
                <p className="mt-1 text-muted">{country.tagline}</p>
                <p className="mt-3 text-sm text-muted">{destinations.length} destinations</p>
              </div>
            </Link>
          ))}
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-line p-8 text-center text-muted">
            More countries coming soon.
          </div>
        </div>
      </section>
    </main>
  );
}
