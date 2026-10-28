// Shape of the content files in /content. Every country follows the same
// format, so adding a country means adding a folder, not code (PLAN.md §4).
import { z } from "zod";

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "use lowercase-words-with-dashes");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD");
const url = z.url();

/** How good a month is for visiting: drives season warnings in the route generator. */
export const MonthRating = z.enum(["great", "good", "mixed", "poor"]);
const twelveMonths = z.array(MonthRating).length(12); // Jan … Dec

/** 1 = some, 2 = good, 3 = one of the best places in the country for this. */
const strength = z.union([z.literal(1), z.literal(2), z.literal(3)]);

/** [min, max] price in the country's own currency. */
const priceRange = z.tuple([z.number().nonnegative(), z.number().nonnegative()]);

export const TransportMode = z.enum(["train", "bus", "car", "tuk-tuk", "ferry", "flight"]);
export const LegStatus = z.enum(["running", "disrupted", "suspended"]);

/** A freely licensed photo, always shown with its credit. */
export const PhotoSchema = z.object({
  src: url,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string(),
  credit: z.string(),
  license: z.string(),
  licenseUrl: url.optional(),
  sourceUrl: url,
});

export const InterestSchema = z.object({
  id: slug,
  name: z.string(),
  description: z.string(),
});
export const InterestsFileSchema = z.object({ interests: z.array(InterestSchema).min(1) });

export const GuideSectionSchema = z.object({
  id: slug,
  title: z.string(),
  summary: z.string(),
  body: z.string(), // Markdown
  sources: z.array(url).min(1),
});

export const CountrySchema = z.object({
  slug,
  name: z.string(),
  currency: z.object({ code: z.string().length(3), symbol: z.string() }),
  timezone: z.string(),
  accent: z.object({ light: z.string(), dark: z.string() }),
  tagline: z.string(),
  photo: PhotoSchema.optional(),
  gateways: z
    .array(
      z.object({
        destination: slug,
        name: z.string(),
        code: z.string(),
        note: z.string(),
      }),
    )
    .min(1),
  guide: z.array(GuideSectionSchema).min(1),
  lastChecked: isoDate,
});

export const ClimateMonthSchema = z.object({
  /** Average daily high and low, °C. */
  high: z.number(),
  low: z.number(),
  /** Average monthly rainfall, mm, and days with rain. */
  rainMm: z.number().nonnegative(),
  rainDays: z.number().nonnegative(),
});

export const ClimateStationSchema = z.object({
  id: slug,
  name: z.string(),
  elevationM: z.number(),
  basis: z.string(),
  source: url,
  months: z.array(ClimateMonthSchema).length(12),
});
export const ClimateFileSchema = z.object({ stations: z.array(ClimateStationSchema).min(1) });

export const RegionSchema = z.object({
  id: slug,
  /** Weather station whose averages represent the region. */
  climateStation: slug,
  name: z.string(),
  summary: z.string(),
  months: twelveMonths,
  monthsNote: z.string(),
});
export const RegionsFileSchema = z.object({ regions: z.array(RegionSchema).min(1) });

export const DestinationSchema = z.object({
  slug,
  name: z.string(),
  region: slug,
  /** A closer weather station than the region's, when the region's would mislead (e.g. hill towns). */
  climateStation: slug.optional(),
  coordinates: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
  summary: z.string().max(180),
  description: z.string(), // Markdown, original writing only
  photo: PhotoSchema.optional(),
  interests: z.record(slug, strength),
  nights: z
    .object({ min: z.number().int().min(0), ideal: z.number().int().min(1), max: z.number().int().min(1) })
    .refine((n) => n.min <= n.ideal && n.ideal <= n.max, "min ≤ ideal ≤ max"),
  /** Overrides the region's months when a place has its own climate or season. */
  months: twelveMonths.optional(),
  monthsNote: z.string().optional(),
  highlights: z
    .array(
      z.object({
        name: z.string(),
        summary: z.string(),
        interests: z.array(slug).min(1),
        cost: priceRange.optional(),
        costNote: z.string().optional(),
      }),
    )
    .min(2),
  solo: z.object({
    /** 1 = quiet, 2 = some travellers around, 3 = easy to meet people. */
    social: strength,
    socialNotes: z.string(),
    safety: z.array(z.string()).min(1),
    tips: z.array(z.string()).min(1),
  }),
  /** Per night for one person, in the country's currency. */
  stay: z.object({ budget: priceRange, mid: priceRange, comfort: priceRange, note: z.string().optional() }),
  gettingAround: z.string(),
  sources: z.array(url).min(1),
  lastChecked: isoDate,
});

export const TravelLegSchema = z.object({
  from: slug,
  to: slug,
  distanceKm: z.number().positive().optional(),
  options: z
    .array(
      z.object({
        mode: TransportMode,
        hours: z.number().positive(),
        cost: priceRange.optional(),
        status: LegStatus,
        note: z.string().optional(),
      }),
    )
    .min(1),
});
export const TravelLegsFileSchema = z.object({
  lastChecked: isoDate,
  sources: z.array(url).min(1),
  legs: z.array(TravelLegSchema).min(1),
});

export type Photo = z.infer<typeof PhotoSchema>;
export type ClimateStation = z.infer<typeof ClimateStationSchema>;
export type ClimateMonth = z.infer<typeof ClimateMonthSchema>;
export type Interest = z.infer<typeof InterestSchema>;
export type Country = z.infer<typeof CountrySchema>;
export type Region = z.infer<typeof RegionSchema>;
export type Destination = z.infer<typeof DestinationSchema>;
export type TravelLeg = z.infer<typeof TravelLegSchema>;
