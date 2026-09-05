// Pricing-model classification for listings and per-person rent derivation.
// Headline stats use base_rent only; total-with-fees feeds a separate figure.

export type PricingModel = "per_bed" | "per_unit" | "unknown";

// Above this per-bed monthly price we assume the number is for the whole unit.
export const PER_BED_CEILING = 900;

export interface ListingLike {
  beds: number | null;
  baseRent: number | null;
  priceStatus: string | null;
  priceDisplay: string | null;
  occupancy: string | null;
}

export function classifyPricingModel(l: ListingLike): PricingModel {
  if (l.priceDisplay && /\/\s*person/i.test(l.priceDisplay)) return "per_bed";
  if (l.occupancy === "shared" || l.occupancy === "private") return "per_bed";
  if (l.baseRent == null) return "unknown";
  if (l.beds != null && l.beds >= 2) {
    return l.baseRent / l.beds < PER_BED_CEILING ? "per_bed" : "per_unit";
  }
  return "unknown";
}

/**
 * Per-person rent on the base-rent basis. NULL when basis unknown or price
 * unlisted — those rows are counted (n_unknown) but never enter medians.
 */
export function deriveRentPerPerson(l: ListingLike, model: PricingModel): number | null {
  if (l.baseRent == null || l.priceStatus === "not_publicly_listed") return null;
  if (model === "per_bed") return l.baseRent;
  if (model === "per_unit") return l.baseRent / Math.max(l.beds ?? 1, 1);
  return null;
}

// Student reports: rent is already per-person; never divide. Guard only.
export function reportBasisFlag(rent: number | null, beds: number | null): string | null {
  if (rent != null && beds != null && beds >= 2 && rent > PER_BED_CEILING * beds) {
    return "possible_per_unit";
  }
  return null;
}
