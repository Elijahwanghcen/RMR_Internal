import { z } from "zod";

// Loud validation at ingest: if Algolia renames a field we want an ingest
// failure (and fallback to the last good snapshot), not nulls in medians.

export const buildingSchema = z.object({
  objectID: z.string(),
  canonical_name: z.string(),
  website_url: z.string().nullish(),
  address: z.string().nullish(),
  place_id: z.string().nullish(),
  google_name: z.string().nullish(),
  google_rating: z.number().nullish(),
  google_rating_count: z.number().nullish(),
  lat: z.number().nullish(),
  lng: z.number().nullish(),
  photos: z.array(z.string()).nullish(),
  reviews: z
    .array(
      z.object({
        rating: z.number().nullish(),
        author: z.string().nullish(),
        relative_time: z.string().nullish(),
        text: z.string().nullish(),
      })
    )
    .nullish(),
  amenities_summary: z.string().nullish(),
  amenities_highlights: z.array(z.string()).nullish(),
  amenities_notable_gaps: z.string().nullish(),
  features: z
    .object({
      community: z.array(z.string()).nullish(),
      premium: z.array(z.string()).nullish(),
      apartment: z.array(z.string()).nullish(),
    })
    .nullish(),
  features_flat: z.array(z.string()).nullish(),
});

export const unitSchema = z.object({
  objectID: z.string(),
  canonical_name: z.string(),
  property_objectID: z.string(),
  unit_label: z.string().nullish(),
  beds: z.number().nullish(),
  baths: z.number().nullish(),
  // sqft is sometimes a range string like "931-943" -> use the midpoint
  sqft: z
    .union([z.number(), z.string()])
    .nullish()
    .transform((v) => {
      if (v == null || typeof v === "number") return v ?? null;
      const m = v.match(/^(\d+)\s*-\s*(\d+)$/);
      if (m) return Math.round((parseInt(m[1], 10) + parseInt(m[2], 10)) / 2);
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : null;
    }),
  base_rent: z.number().nullish(),
  total_price_with_mandatory_fees: z.number().nullish(),
  price_basis: z.string().nullish(),
  price_status: z.string().nullish(),
  availability: z.string().nullish(),
  occupancy: z.string().nullish(),
  concessions_raw: z.string().nullish(),
  concessions_type: z.string().nullish(),
  concessions_value: z.number().nullish(),
  layout_image_url: z.string().nullish(),
  price_image_url: z.string().nullish(),
  price_display: z.string().nullish(),
  layout_display: z.string().nullish(),
  sqft_display: z.string().nullish(),
  source_url: z.string().nullish(),
  source_type: z.string().nullish(),
  scraped_at: z.string().nullish(),
});

export type AlgoliaBuilding = z.infer<typeof buildingSchema>;
export type AlgoliaUnit = z.infer<typeof unitSchema>;

export function validateBuildings(raw: unknown[]): AlgoliaBuilding[] {
  return raw.map((r, i) => {
    const parsed = buildingSchema.safeParse(r);
    if (!parsed.success) {
      throw new Error(
        `rentright_buildings row ${i} failed validation: ${parsed.error.issues
          .map((iss) => `${iss.path.join(".")}: ${iss.message}`)
          .join("; ")}`
      );
    }
    return parsed.data;
  });
}

export function validateUnits(raw: unknown[]): AlgoliaUnit[] {
  return raw.map((r, i) => {
    const parsed = unitSchema.safeParse(r);
    if (!parsed.success) {
      throw new Error(
        `austin_leases_units row ${i} failed validation: ${parsed.error.issues
          .map((iss) => `${iss.path.join(".")}: ${iss.message}`)
          .join("; ")}`
      );
    }
    return parsed.data;
  });
}
