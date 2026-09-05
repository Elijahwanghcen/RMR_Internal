import path from "path";
import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import * as t from "@/db/schema";
import { validateBuildings, validateUnits } from "./algoliaSchemas";
import { loadRawData, signingDateOf, type RawData } from "./rawData";
import { loadAliases } from "./aliasesFile";
import { EntityResolver, type Candidate } from "./entityResolution";
import { normalizeName } from "./normalize";
import { parseLayout } from "./parseLayout";
import { redactNote } from "./redact";
import { classifyPricingModel, deriveRentPerPerson, reportBasisFlag } from "./priceBasis";
import { classifyLeaseTerm } from "./leaseTerm";
import { flagOutliers, type OutlierRow } from "./outliers";
import { zoneFor } from "@/lib/geo/zones";
import { distanceToCampusMi } from "@/lib/geo/haversine";
import { computeAllStats } from "@/lib/stats/compute";
import fs from "fs";

export interface IngestReport {
  ranAt: string;
  source: string; // algolia | cache_fallback | bundled
  snapshotDate: string;
  buildings: number;
  units: number;
  submissions: number;
  ratings: number;
  surveys: number;
  matched: { alias: number; exact: number; fuzzy: number; unmatched: number };
  unmatchedNames: number;
  outliersFlagged: number;
  zoneAssignments: Record<string, number>;
  csvOnlyNames: string[]; // in properties.csv but missing from Algolia
  errors: string[];
}

export interface PipelineInput {
  buildingsRaw: unknown[];
  unitsRaw: unknown[];
  snapshotDate: string; // YYYY-MM-DD
  source: string;
  dataDir: string;
  rawDataPath: string;
  propertiesCsvPath?: string;
}

export function runPipeline(db: Db, input: PipelineInput): IngestReport {
  const buildings = validateBuildings(input.buildingsRaw);
  const units = validateUnits(input.unitsRaw);
  const rawData: RawData = loadRawData(input.rawDataPath);
  const aliasesJson = loadAliases(input.dataDir);
  const now = Date.now();

  const report: IngestReport = {
    ranAt: new Date().toISOString(),
    source: input.source,
    snapshotDate: input.snapshotDate,
    buildings: buildings.length,
    units: units.length,
    submissions: rawData.submissions.length,
    ratings: rawData.ratings.length,
    surveys: rawData.surveys.length,
    matched: { alias: 0, exact: 0, fuzzy: 0, unmatched: 0 },
    unmatchedNames: 0,
    outliersFlagged: 0,
    zoneAssignments: {},
    csvOnlyNames: [],
    errors: [],
  };

  db.transaction((tx) => {
    // Rebuild data tables wholesale — pipeline is idempotent by design.
    tx.delete(t.googleReviews).run();
    tx.delete(t.listings).run();
    tx.delete(t.studentReports).run();
    tx.delete(t.appRatings).run();
    tx.delete(t.surveys).run();
    tx.delete(t.unmatchedNames).run();
    tx.delete(t.aliases).run();
    // Long-tail properties created in past ingests survive via re-resolution;
    // drop all and re-create so removals in source data propagate.
    tx.delete(t.properties).run();

    // 1. Core properties from Algolia buildings
    for (const b of buildings) {
      const zone = zoneFor(b.lat ?? null, b.lng ?? null);
      report.zoneAssignments[zone] = (report.zoneAssignments[zone] ?? 0) + 1;
      tx.insert(t.properties)
        .values({
          id: b.objectID,
          canonicalName: b.canonical_name,
          normName: normalizeName(b.canonical_name),
          websiteUrl: b.website_url ?? null,
          address: b.address ?? null,
          placeId: b.place_id ?? null,
          googleName: b.google_name ?? null,
          googleRating: b.google_rating ?? null,
          googleRatingCount: b.google_rating_count ?? null,
          lat: b.lat ?? null,
          lng: b.lng ?? null,
          zone,
          distanceToCampusMi:
            b.lat != null && b.lng != null ? distanceToCampusMi(b.lat, b.lng) : null,
          isCore: 1,
          amenitiesSummary: b.amenities_summary ?? null,
          amenitiesHighlights: b.amenities_highlights ?? null,
          amenitiesNotableGaps: b.amenities_notable_gaps ?? null,
          features: b.features
            ? {
                community: b.features.community ?? undefined,
                premium: b.features.premium ?? undefined,
                apartment: b.features.apartment ?? undefined,
              }
            : null,
          featuresFlat: b.features_flat ?? null,
          photos: b.photos ?? null,
          updatedAt: now,
        })
        .run();

      (b.reviews ?? []).forEach((r, i) => {
        tx.insert(t.googleReviews)
          .values({
            id: `${b.objectID}::${i}`,
            propertyId: b.objectID,
            rating: r.rating ?? null,
            author: r.author ?? null,
            relativeTime: r.relative_time ?? null,
            text: redactNote(r.text ?? ""),
          })
          .run();
      });
    }

    // properties.csv cross-check (report-only)
    if (input.propertiesCsvPath && fs.existsSync(input.propertiesCsvPath)) {
      const csvNames = fs
        .readFileSync(input.propertiesCsvPath, "utf8")
        .split("\n")
        .slice(1)
        .map((line) => line.split(",")[0]?.trim())
        .filter(Boolean);
      const known = new Set(buildings.map((b) => normalizeName(b.canonical_name)));
      report.csvOnlyNames = csvNames.filter((n) => !known.has(normalizeName(n)));
    }

    // 2. Listings
    const propertyIds = new Set(buildings.map((b) => b.objectID));
    for (const u of units) {
      if (!propertyIds.has(u.property_objectID)) {
        report.errors.push(`unit ${u.objectID}: unknown property ${u.property_objectID}`);
        continue;
      }
      const like = {
        beds: u.beds ?? null,
        baseRent: u.base_rent ?? null,
        priceStatus: u.price_status ?? null,
        priceDisplay: u.price_display ?? null,
        occupancy: u.occupancy ?? null,
      };
      const model = classifyPricingModel(like);
      tx.insert(t.listings)
        .values({
          id: u.objectID,
          propertyId: u.property_objectID,
          unitLabel: u.unit_label ?? null,
          beds: u.beds ?? null,
          baths: u.baths ?? null,
          sqft: u.sqft ?? null,
          baseRent: u.base_rent ?? null,
          totalPriceWithFees: u.total_price_with_mandatory_fees ?? null,
          priceBasis: u.price_basis ?? null,
          priceStatus: u.price_status ?? null,
          availability: u.availability ?? null,
          leaseTerm: classifyLeaseTerm(u.availability),
          occupancy: u.occupancy ?? null,
          concessionsRaw: u.concessions_raw ?? null,
          concessionsType: u.concessions_type ?? null,
          concessionsValue: u.concessions_value ?? null,
          layoutImageUrl: u.layout_image_url ?? null,
          priceImageUrl: u.price_image_url ?? null,
          priceDisplay: u.price_display ?? null,
          layoutDisplay: u.layout_display ?? null,
          sqftDisplay: u.sqft_display ?? null,
          sourceUrl: u.source_url ?? null,
          sourceType: u.source_type ?? null,
          scrapedAt: u.scraped_at ?? null,
          pricingModel: model,
          rentPerPerson: deriveRentPerPerson(like, model),
        })
        .run();

      // price history (idempotent per listing+date)
      tx.insert(t.listingsHistory)
        .values({
          listingId: u.objectID,
          propertyId: u.property_objectID,
          snapshotDate: input.snapshotDate,
          baseRent: u.base_rent ?? null,
        })
        .onConflictDoUpdate({
          target: [t.listingsHistory.listingId, t.listingsHistory.snapshotDate],
          set: { baseRent: u.base_rent ?? null },
        })
        .run();
    }

    // 3. Entity resolution setup for Raw_data collections
    const candidates: Candidate[] = buildings.map((b) => ({
      id: b.objectID,
      canonicalName: b.canonical_name,
      googleName: b.google_name,
    }));
    const resolver = new EntityResolver(candidates, aliasesJson);

    // Mirror aliases.json into the DB table
    for (const [alias, propertyId] of Object.entries(aliasesJson)) {
      tx.insert(t.aliases)
        .values({
          aliasNorm: normalizeName(alias),
          propertyId,
          source: "manual",
          createdAt: now,
        })
        .onConflictDoNothing()
        .run();
    }

    // Long-tail: unresolved names become non-core properties so their data
    // stays queryable. Slug id from norm name.
    const longTail = new Map<string, string>(); // norm -> property id
    const unmatchedAgg = new Map<
      string,
      { raw: string; sources: { submissions: number; ratings: number; surveys: number }; bestId: string | null; bestScore: number | null }
    >();

    const resolveOrLongTail = (
      raw: string,
      sourceKey: "submissions" | "ratings" | "surveys"
    ): { propertyId: string | null; method: string; score: number | null } => {
      const r = resolver.resolve(raw);
      if (r.propertyId) {
        report.matched[r.method as "alias" | "exact" | "fuzzy"] += 1;
        return { propertyId: r.propertyId, method: r.method, score: r.score };
      }
      report.matched.unmatched += 1;
      const norm = normalizeName(raw);
      let entry = unmatchedAgg.get(norm);
      if (!entry) {
        entry = {
          raw,
          sources: { submissions: 0, ratings: 0, surveys: 0 },
          bestId: r.bestCandidateId,
          bestScore: r.bestScore,
        };
        unmatchedAgg.set(norm, entry);
      }
      entry.sources[sourceKey] += 1;

      // create long-tail property once per norm name
      let ltId = longTail.get(norm);
      if (!ltId) {
        ltId = `lt-${norm.replace(/\s+/g, "-")}`.slice(0, 80);
        longTail.set(norm, ltId);
        tx.insert(t.properties)
          .values({
            id: ltId,
            canonicalName: raw.trim(),
            normName: norm,
            isCore: 0,
            updatedAt: now,
          })
          .onConflictDoNothing()
          .run();
      }
      return { propertyId: ltId, method: "unmatched", score: null };
    };

    // 4. Student reports
    const outlierRows: OutlierRow[] = [];
    for (const s of rawData.submissions) {
      const res = resolveOrLongTail(s.hood, "submissions");
      const { beds, baths } = parseLayout(s.layout);
      const { year, date } = signingDateOf(s);
      const rent = s.rent ?? null;
      const basisFlag = reportBasisFlag(rent, beds);
      tx.insert(t.studentReports)
        .values({
          id: s.id,
          propertyId: res.propertyId,
          rawHood: s.hood,
          matchMethod: res.method,
          matchScore: res.score,
          layoutRaw: s.layout ?? null,
          beds,
          baths,
          rentReported: rent,
          rentPerPerson: basisFlag ? null : rent, // per-person by definition; guard excludes suspect rows
          doubleOccupancy: s.doubleOccupancy ? 1 : 0,
          isOwnPlace: s.isOwnPlace ? 1 : 0,
          utilsIncluded: s.utils ? 1 : 0,
          utilityCost: s.utilityCost ?? null,
          parking: s.parking ? 1 : 0,
          parkingCost: s.parkingCost ?? null,
          signingMonth: s.signingMonth ?? null,
          signingYear: year,
          signingDate: date,
          note: redactNote(s.note),
          noteRaw: s.note ?? null,
          outlierFlag: 0,
          basisFlag,
          createdAt: s.createdAt ?? null,
        })
        .onConflictDoNothing()
        .run();

      // isOwnPlace=true is the NORMAL case ("this is my own place") — 94% of
      // rows — so it must not be excluded from stats.
      if (!basisFlag && rent != null) {
        outlierRows.push({
          id: s.id,
          propertyId: res.propertyId,
          beds,
          sharedOccupancy: !!s.doubleOccupancy,
          rentPerPerson: rent,
        });
      }
    }

    // 5. Outlier flagging
    const flagged = flagOutliers(outlierRows);
    report.outliersFlagged = flagged.size;
    for (const id of flagged) {
      tx.update(t.studentReports)
        .set({ outlierFlag: 1 })
        .where(eq(t.studentReports.id, id))
        .run();
    }

    // 6. Ratings + surveys
    for (const r of rawData.ratings) {
      const res = resolveOrLongTail(r.building, "ratings");
      tx.insert(t.appRatings)
        .values({
          id: r.id,
          propertyId: res.propertyId,
          rawBuilding: r.building,
          rating: r.rating,
          createdAt: r.createdAt ?? null,
        })
        .onConflictDoNothing()
        .run();
    }
    for (const s of rawData.surveys) {
      const res = resolveOrLongTail(s.building, "surveys");
      tx.insert(t.surveys)
        .values({
          id: s.id,
          propertyId: res.propertyId,
          rawBuilding: s.building,
          complaints: s.complaints ?? null,
          complaintOther: s.complaintOther ?? null,
          maintenanceRating: s.maintenanceRating ?? null,
          maintenanceNote: redactNote(s.maintenanceNote),
          elevatorCount: s.elevatorCount ?? null,
          elevatorUptime: s.elevatorUptime ?? null,
          quality: s.quality ?? null,
          createdAt: s.createdAt ?? null,
        })
        .onConflictDoNothing()
        .run();
    }

    // 7. Unmatched report rows
    for (const [norm, entry] of unmatchedAgg) {
      tx.insert(t.unmatchedNames)
        .values({
          normName: norm,
          rawName: entry.raw,
          sources: entry.sources,
          bestCandidateId: entry.bestId,
          bestScore: entry.bestScore,
          status: "long_tail",
        })
        .onConflictDoNothing()
        .run();
    }
    report.unmatchedNames = unmatchedAgg.size;

    // 8. Stats
    computeAllStats(tx as unknown as Db);

    // 9. Meta
    const setMeta = (key: string, value: string) =>
      tx.insert(t.meta)
        .values({ key, value })
        .onConflictDoUpdate({ target: t.meta.key, set: { value } })
        .run();
    setMeta("last_refresh_date", input.snapshotDate);
    setMeta("last_refresh_source", input.source);
    setMeta("ingest_report", JSON.stringify(report));
  });

  return report;
}

export function defaultPaths() {
  const dataDir = path.resolve(process.cwd(), process.env.DATA_DIR ?? "./data");
  return {
    dataDir,
    rawDataPath: path.resolve(process.cwd(), process.env.RAW_DATA_PATH ?? "./data/Raw_data.json"),
    propertiesCsvPath: "/Users/elijahwangchen/FML_scraper/properties.csv",
  };
}
