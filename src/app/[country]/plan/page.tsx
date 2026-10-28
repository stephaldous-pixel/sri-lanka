import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Planner } from "@/components/planner/planner";
import { getCountry, getInterests } from "@/content";
import { toPlannerData } from "@/planner/data";

export async function generateMetadata({ params }: PageProps<"/[country]/plan">): Promise<Metadata> {
  const content = getCountry((await params).country);
  return content ? { title: `Plan your ${content.country.name} route` } : {};
}

export default async function PlanPage({ params }: PageProps<"/[country]/plan">) {
  const content = getCountry((await params).country);
  if (!content) notFound();
  const { country } = content;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      {/* Hidden on phones once a route is showing (see .plan-intro in globals.css). */}
      <div className="plan-intro">
        <Breadcrumbs items={[{ href: `/${country.slug}`, label: country.name }, { label: "Plan a route" }]} />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Plan your {country.name} route</h1>
        <p className="mt-2 max-w-2xl text-lg text-muted">
          Tell us what you love doing and how you like to travel. We&apos;ll suggest a route that fits
          the season, keeps travel sensible and explains every stop.
        </p>
      </div>
      <Planner data={toPlannerData(content, getInterests())} />
    </main>
  );
}
