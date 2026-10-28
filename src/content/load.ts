// Reads and validates /content. Throws with a readable list of problems so a
// typo in a content file fails the build instead of breaking a page.
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import type { z } from "zod";
import {
  ClimateFileSchema,
  CountrySchema,
  DestinationSchema,
  InterestsFileSchema,
  RegionsFileSchema,
  TravelLegsFileSchema,
  type ClimateStation,
  type Country,
  type Destination,
  type Interest,
  type Region,
  type TravelLeg,
} from "./schema";

const CONTENT_DIR = path.join(process.cwd(), "content");

export type CountryContent = {
  country: Country;
  regions: Region[];
  destinations: Destination[];
  legs: TravelLeg[];
  legsLastChecked: string;
  climate: ClimateStation[];
};

function readYaml<S extends z.ZodType>(file: string, schema: S): z.infer<S> {
  const result = schema.safeParse(parse(fs.readFileSync(file, "utf8")));
  if (!result.success) {
    const where = path.relative(process.cwd(), file);
    const problems = result.error.issues.map((i) => `  - ${i.path.join(".") || "(file)"}: ${i.message}`);
    throw new Error(`Invalid content in ${where}:\n${problems.join("\n")}`);
  }
  return result.data;
}

export function loadInterests(): Interest[] {
  return readYaml(path.join(CONTENT_DIR, "interests.yaml"), InterestsFileSchema).interests;
}

export function listCountrySlugs(): string[] {
  return fs
    .readdirSync(path.join(CONTENT_DIR, "countries"), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

export function loadCountry(slug: string): CountryContent {
  const dir = path.join(CONTENT_DIR, "countries", slug);
  const destDir = path.join(dir, "destinations");
  const legsFile = readYaml(path.join(dir, "travel-legs.yaml"), TravelLegsFileSchema);
  return {
    country: readYaml(path.join(dir, "country.yaml"), CountrySchema),
    regions: readYaml(path.join(dir, "regions.yaml"), RegionsFileSchema).regions,
    destinations: fs
      .readdirSync(destDir)
      .filter((f) => f.endsWith(".yaml"))
      .sort()
      .map((f) => readYaml(path.join(destDir, f), DestinationSchema)),
    legs: legsFile.legs,
    legsLastChecked: legsFile.lastChecked,
    climate: readYaml(path.join(dir, "climate.yaml"), ClimateFileSchema).stations,
  };
}

/** Checks that content files point at each other correctly. Returns problems found. */
export function crossCheck(content: CountryContent, interests: Interest[]): string[] {
  const problems: string[] = [];
  const { country, regions, destinations, legs, climate } = content;
  const stationIds = new Set(climate.map((s) => s.id));
  const interestIds = new Set(interests.map((i) => i.id));
  const regionIds = new Set(regions.map((r) => r.id));
  const destSlugs = new Set(destinations.map((d) => d.slug));

  const dupes = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i);
  for (const id of dupes(destinations.map((d) => d.slug))) problems.push(`duplicate destination "${id}"`);
  for (const id of dupes(regions.map((r) => r.id))) problems.push(`duplicate region "${id}"`);

  for (const g of country.gateways) {
    if (!destSlugs.has(g.destination)) problems.push(`gateway ${g.code} → unknown destination "${g.destination}"`);
  }
  for (const r of regions) {
    if (!stationIds.has(r.climateStation)) problems.push(`region "${r.id}": unknown climate station "${r.climateStation}"`);
  }
  for (const d of destinations) {
    if (!regionIds.has(d.region)) problems.push(`${d.slug}: unknown region "${d.region}"`);
    if (d.climateStation && !stationIds.has(d.climateStation)) problems.push(`${d.slug}: unknown climate station "${d.climateStation}"`);
    for (const id of Object.keys(d.interests)) {
      if (!interestIds.has(id)) problems.push(`${d.slug}: unknown interest "${id}"`);
    }
    for (const h of d.highlights) {
      for (const id of h.interests) {
        if (!interestIds.has(id)) problems.push(`${d.slug} › ${h.name}: unknown interest "${id}"`);
      }
    }
  }
  for (const r of regions) {
    if (!destinations.some((d) => d.region === r.id)) problems.push(`region "${r.id}" has no destinations`);
  }

  const seen = new Set<string>();
  for (const leg of legs) {
    for (const end of [leg.from, leg.to]) {
      if (!destSlugs.has(end)) problems.push(`leg ${leg.from} → ${leg.to}: unknown destination "${end}"`);
    }
    if (leg.from === leg.to) problems.push(`leg ${leg.from} → ${leg.to}: goes nowhere`);
    const key = [leg.from, leg.to].sort().join("|");
    if (seen.has(key)) problems.push(`leg ${leg.from} ↔ ${leg.to} is listed twice`);
    seen.add(key);
  }

  // Every destination must be reachable from the first gateway, or routes can't include it.
  const neighbours = new Map<string, string[]>();
  for (const leg of legs) {
    neighbours.set(leg.from, [...(neighbours.get(leg.from) ?? []), leg.to]);
    neighbours.set(leg.to, [...(neighbours.get(leg.to) ?? []), leg.from]);
  }
  const start = country.gateways[0]?.destination;
  const reached = new Set<string>(start ? [start] : []);
  const queue = [...reached];
  while (queue.length) {
    for (const next of neighbours.get(queue.shift()!) ?? []) {
      if (!reached.has(next)) {
        reached.add(next);
        queue.push(next);
      }
    }
  }
  for (const d of destinations) {
    if (!reached.has(d.slug)) problems.push(`${d.slug}: can't be reached from ${start} by any travel leg`);
  }
  return problems;
}
