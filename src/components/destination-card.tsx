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
        sizes="(min-width: 1024px) 33vw, 50vw"
        className="aspect-square w-full rounded-xl transition duration-300 sm:aspect-[4/3] sm:rounded-2xl group-hover:opacity-90 group-focus-visible:ring-2 group-focus-visible:ring-accent group-focus-visible:ring-offset-2"
        showCredit={false}
      />
      <div className="mt-2 sm:mt-3">
        <div className="sm:flex sm:items-baseline sm:justify-between sm:gap-3">
          <h3 className="text-[0.9375rem] font-semibold leading-snug group-hover:text-accent sm:text-base">{destination.name}</h3>
          {best && <span className="mt-0.5 block text-xs text-muted sm:mt-0 sm:shrink-0">Best {best}</span>}
        </div>
        <p className="mt-1 hidden text-sm text-muted sm:line-clamp-2">{destination.summary}</p>
      </div>
    </Link>
  );
}

export function DestinationGrid({ content, destinations }: { content: CountryContent; destinations: Destination[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-3">
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
