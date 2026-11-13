import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SharedTripView } from "@/components/planner/shared-trip";
import { getCountry, getInterests } from "@/content";
import { toPlannerData } from "@/planner/data";

// A trip shared by link. The trip itself is in the link's #fragment, so this
// page is the same for everyone; it's open without the site password (see proxy.ts).
export async function generateMetadata({ params }: PageProps<"/[country]/trip">): Promise<Metadata> {
  const content = getCountry((await params).country);
  return content ? { title: `A trip to ${content.country.name}`, robots: { index: false, follow: false } } : {};
}

export default async function TripPage({ params }: PageProps<"/[country]/trip">) {
  const content = getCountry((await params).country);
  if (!content) notFound();
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <SharedTripView data={toPlannerData(content, getInterests())} />
    </main>
  );
}
