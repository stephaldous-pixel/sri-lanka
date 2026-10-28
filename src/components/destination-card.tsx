import Link from "next/link";
import type { Destination } from "@/content/schema";
import { Photo } from "./photo";
import { SocialBadge } from "./social-badge";

export function DestinationCard({ countrySlug, destination }: { countrySlug: string; destination: Destination }) {
  return (
    <Link
      href={`/${countrySlug}/places/${destination.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-accent"
    >
      <Photo
        photo={destination.photo}
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="aspect-[3/2] w-full"
        showCredit={false}
      />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-semibold group-hover:text-accent">{destination.name}</h3>
        <p className="text-sm text-muted">{destination.summary}</p>
        <div className="mt-auto pt-2">
          <SocialBadge level={destination.solo.social} />
        </div>
      </div>
    </Link>
  );
}

export function DestinationGrid({ countrySlug, destinations }: { countrySlug: string; destinations: Destination[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {destinations.map((d) => (
        <DestinationCard key={d.slug} countrySlug={countrySlug} destination={d} />
      ))}
    </div>
  );
}
