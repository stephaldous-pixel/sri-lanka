import Link from "next/link";
import { Photo } from "@/components/photo";
import { getCountry, getCountrySlugs } from "@/content";
import { SITE_TAGLINE } from "@/lib/site";
import { button } from "@/lib/ui";

export default function Home() {
  const countries = getCountrySlugs().map((slug) => getCountry(slug)!);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <section className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">{SITE_TAGLINE}</h1>
        <p className="mt-5 text-lg text-muted">
          Tell us what you love doing. We&apos;ll suggest a route that fits the season, with honest
          notes on safety, meeting people and what things cost for one.
        </p>
        <Link href="/sri-lanka/plan" className={`${button.primary} mt-8 px-6 py-3 text-base`}>
          Plan a Sri Lanka trip
        </Link>
      </section>

      <section className="mt-20" aria-labelledby="countries-heading">
        <h2 id="countries-heading" className="text-sm font-medium text-muted">
          Destinations
        </h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          {countries.map(({ country, destinations }) => (
            <Link key={country.slug} href={`/${country.slug}`} className="group relative block overflow-hidden rounded-3xl">
              <Photo photo={country.photo} sizes="(min-width: 768px) 50vw, 100vw" className="aspect-[4/3] w-full transition duration-500 group-hover:scale-[1.02]" priority showCredit={false} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" aria-hidden="true" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                <h3 className="text-2xl font-semibold">{country.name}</h3>
                <p className="mt-1 text-white/85">{destinations.length} places · {country.tagline}</p>
              </div>
            </Link>
          ))}
          <div className="flex aspect-[4/3] items-center justify-center rounded-3xl bg-surface-sunken p-8 text-center text-muted">
            More countries coming soon
          </div>
        </div>
      </section>
    </main>
  );
}
