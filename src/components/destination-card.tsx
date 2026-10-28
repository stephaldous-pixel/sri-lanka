import Link from "next/link";
import type { CountryContent } from "@/content/load";
import { monthsFor } from "@/content";
import type { Destination } from "@/content/schema";
import { bestMonthsLabel } from "@/lib/format";
import { Photo } from "./photo";

export function DestinationCard({ countrySlug, destination, best }: { countrySlug: string; destination: Destination; best: string }) {
  return (
    <Link href={`/${countrySlug}/places/${destination.slug}`} className="group block focus-visible:outline-none">
      <Photo
        photo={destination.photo}
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="aspect-[4/3] w-full rounded-2xl transition duration-300 group-hover:opacity-90 group-focus-visible:ring-2 group-focus-visible:ring-accent group-focus-visible:ring-offset-2"
        showCredit={false}
      />
      <div className="mt-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-semibold group-hover:text-accent">{destination.name}</h3>
          {best && <span className="shrink-0 text-xs text-muted">Best {best}</span>}
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{destination.summary}</p>
      </div>
    </Link>
  );
}

export function DestinationGrid({ content, destinations }: { content: CountryContent; destinations: Destination[] }) {
  return (
    <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {destinations.map((d) => (
        <DestinationCard
          key={d.slug}
          countrySlug={content.country.slug}
          destination={d}
          best={bestMonthsLabel(monthsFor(content, d).months)}
        />
      ))}
    </div>
  );
}
