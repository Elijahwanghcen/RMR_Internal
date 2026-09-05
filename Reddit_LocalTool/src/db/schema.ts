import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// Core + long-tail properties. id = Algolia objectID for core, slug for long-tail.
export const properties = sqliteTable(
  "properties",
  {
    id: text("id").primaryKey(),
    canonicalName: text("canonical_name").notNull(),
    normName: text("norm_name").notNull(),
    websiteUrl: text("website_url"),
    address: text("address"),
    placeId: text("place_id"),
    googleName: text("google_name"),
    googleRating: real("google_rating"),
    googleRatingCount: integer("google_rating_count"),
    lat: real("lat"),
    lng: real("lng"),
    zone: text("zone"),
    zoneOverride: text("zone_override"),
    distanceToCampusMi: real("distance_to_campus_mi"),
    isCore: integer("is_core").notNull().default(0),
    amenitiesSummary: text("amenities_summary"),
    amenitiesHighlights: text("amenities_highlights", { mode: "json" }).$type<string[]>(),
    amenitiesNotableGaps: text("amenities_notable_gaps"),
    features: text("features", { mode: "json" }).$type<{
      community?: string[];
      premium?: string[];
      apartment?: string[];
    }>(),
    featuresFlat: text("features_flat", { mode: "json" }).$type<string[]>(),
    photos: text("photos", { mode: "json" }).$type<string[]>(),
    updatedAt: integer("updated_at"),
  },
  (t) => [index("idx_properties_norm_name").on(t.normName)]
);

export const googleReviews = sqliteTable(
  "google_reviews",
  {
    id: text("id").primaryKey(), // propertyId::index
    propertyId: text("property_id").notNull(),
    rating: integer("rating"),
    author: text("author"),
    relativeTime: text("relative_time"),
    text: text("text"),
  },
  (t) => [index("idx_greviews_property").on(t.propertyId)]
);

// Mirrored to/from data/aliases.json (JSON file is source of truth).
export const aliases = sqliteTable("aliases", {
  aliasNorm: text("alias_norm").primaryKey(),
  propertyId: text("property_id").notNull(),
  source: text("source").notNull().default("manual"), // manual | confirmed_fuzzy
  createdAt: integer("created_at"),
});

export const listings = sqliteTable(
  "listings",
  {
    id: text("id").primaryKey(), // Algolia unit objectID
    propertyId: text("property_id").notNull(),
    unitLabel: text("unit_label"),
    beds: integer("beds"),
    baths: real("baths"),
    sqft: integer("sqft"),
    baseRent: real("base_rent"),
    totalPriceWithFees: real("total_price_with_fees"),
    priceBasis: text("price_basis"), // base | total | null
    priceStatus: text("price_status"), // listed | not_publicly_listed
    availability: text("availability"),
    leaseTerm: text("lease_term"), // full_term | academic_year | immediate | spring | unknown
    occupancy: text("occupancy"), // shared | private | unknown
    concessionsRaw: text("concessions_raw"),
    concessionsType: text("concessions_type"),
    concessionsValue: real("concessions_value"),
    layoutImageUrl: text("layout_image_url"),
    priceImageUrl: text("price_image_url"),
    priceDisplay: text("price_display"),
    layoutDisplay: text("layout_display"),
    sqftDisplay: text("sqft_display"),
    sourceUrl: text("source_url"),
    sourceType: text("source_type"),
    scrapedAt: text("scraped_at"),
    // derived
    pricingModel: text("pricing_model"), // per_bed | per_unit | unknown
    rentPerPerson: real("rent_per_person"), // base-rent basis only; NULL if unknown basis or unlisted
  },
  (t) => [index("idx_listings_property").on(t.propertyId)]
);

// Daily price history harvested from Algolia snapshots.
export const listingsHistory = sqliteTable(
  "listings_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    listingId: text("listing_id").notNull(),
    propertyId: text("property_id").notNull(),
    snapshotDate: text("snapshot_date").notNull(), // YYYY-MM-DD
    baseRent: real("base_rent"),
  },
  (t) => [
    uniqueIndex("uq_history_listing_date").on(t.listingId, t.snapshotDate),
    index("idx_history_property").on(t.propertyId),
  ]
);

export const studentReports = sqliteTable(
  "student_reports",
  {
    id: text("id").primaryKey(),
    propertyId: text("property_id"), // NULL when unmatched
    rawHood: text("raw_hood").notNull(),
    matchMethod: text("match_method").notNull(), // alias | exact | fuzzy | unmatched
    matchScore: real("match_score"),
    layoutRaw: text("layout_raw"),
    beds: integer("beds"),
    baths: real("baths"),
    rentReported: real("rent_reported"),
    rentPerPerson: real("rent_per_person"),
    doubleOccupancy: integer("double_occupancy").notNull().default(0),
    isOwnPlace: integer("is_own_place").notNull().default(0),
    utilsIncluded: integer("utils_included").notNull().default(0),
    utilityCost: real("utility_cost"),
    parking: integer("parking").notNull().default(0),
    parkingCost: real("parking_cost"),
    signingMonth: text("signing_month"),
    signingYear: integer("signing_year"),
    signingDate: text("signing_date"), // YYYY-MM-01 derived; NULL if unknown
    note: text("note"), // PII-redacted; safe for display + AI
    noteRaw: text("note_raw"), // original — never rendered or prompted
    sentiment: real("sentiment"),
    outlierFlag: integer("outlier_flag").notNull().default(0),
    basisFlag: text("basis_flag"), // possible_per_unit | null
    createdAt: integer("created_at"),
  },
  (t) => [index("idx_reports_property").on(t.propertyId)]
);

export const appRatings = sqliteTable(
  "app_ratings",
  {
    id: text("id").primaryKey(),
    propertyId: text("property_id"),
    rawBuilding: text("raw_building").notNull(),
    rating: integer("rating").notNull(),
    createdAt: integer("created_at"),
  },
  (t) => [index("idx_ratings_property").on(t.propertyId)]
);

export const surveys = sqliteTable(
  "surveys",
  {
    id: text("id").primaryKey(),
    propertyId: text("property_id"),
    rawBuilding: text("raw_building").notNull(),
    complaints: text("complaints", { mode: "json" }).$type<string[]>(),
    complaintOther: text("complaint_other"),
    maintenanceRating: integer("maintenance_rating"),
    maintenanceNote: text("maintenance_note"),
    elevatorCount: integer("elevator_count"),
    elevatorUptime: real("elevator_uptime"),
    quality: text("quality"),
    createdAt: integer("created_at"),
  },
  (t) => [index("idx_surveys_property").on(t.propertyId)]
);

export const unmatchedNames = sqliteTable("unmatched_names", {
  normName: text("norm_name").primaryKey(),
  rawName: text("raw_name").notNull(),
  sources: text("sources", { mode: "json" }).$type<{
    submissions?: number;
    ratings?: number;
    surveys?: number;
  }>(),
  bestCandidateId: text("best_candidate_id"),
  bestScore: real("best_score"),
  status: text("status").notNull().default("pending"), // pending | aliased | long_tail | ignored
});

export const statsCache = sqliteTable(
  "stats_cache",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    scope: text("scope").notNull(), // property | zone | market
    propertyId: text("property_id"),
    zone: text("zone"),
    bedCount: integer("bed_count"), // NULL = all beds
    metric: text("metric").notNull(),
    value: real("value"),
    n: integer("n").notNull().default(0),
    meta: text("meta", { mode: "json" }),
    computedAt: integer("computed_at"),
  },
  (t) => [
    uniqueIndex("uq_stats").on(t.scope, t.propertyId, t.zone, t.bedCount, t.metric),
    index("idx_stats_property").on(t.propertyId),
  ]
);

export const aiCache = sqliteTable("ai_cache", {
  key: text("key").primaryKey(), // sha256(type + input payload)
  type: text("type").notNull(), // review_summary | chart_spec | reddit_draft | entity_extract
  propertyId: text("property_id"),
  output: text("output", { mode: "json" }),
  model: text("model"),
  createdAt: integer("created_at"),
});

export const boards = sqliteTable("boards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: integer("created_at"),
});

export const savedCharts = sqliteTable("saved_charts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  boardId: integer("board_id"),
  title: text("title").notNull(),
  chartSpec: text("chart_spec", { mode: "json" }).notNull(),
  createdAt: integer("created_at"),
});

export const meta = sqliteTable("meta", {
  key: text("key").primaryKey(),
  value: text("value"),
});
