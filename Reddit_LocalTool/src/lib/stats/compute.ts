import { sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import * as t from "@/db/schema";

// All Section-3.2 statistics, recomputed after every ingest and after AI
// summary batches. Delete-and-rewrite of stats_cache (~few thousand rows).

// "Current" reported rent = signed within this many months.
export const RECENCY_MONTHS = 12;

interface NumRow {
  [k: string]: unknown;
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined)
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  return sorted[base];
}

function summary(values: number[]) {
  const s = [...values].sort((a, b) => a - b);
  return {
    median: quantile(s, 0.5),
    mean: s.reduce((a, b) => a + b, 0) / s.length,
    p25: quantile(s, 0.25),
    p75: quantile(s, 0.75),
    min: s[0],
    max: s[s.length - 1],
    n: s.length,
  };
}

function recencyCutoffDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - RECENCY_MONTHS);
  return d.toISOString().slice(0, 10);
}

type StatRow = typeof t.statsCache.$inferInsert;

export function computeAllStats(db: Db): void {
  const now = Date.now();
  const rows: StatRow[] = [];
  const cutoff = recencyCutoffDate();

  const push = (
    scope: "property" | "zone" | "market",
    key: { propertyId?: string | null; zone?: string | null },
    bedCount: number | null,
    metric: string,
    value: number | null,
    n: number,
    meta?: unknown
  ) => {
    rows.push({
      scope,
      propertyId: key.propertyId ?? null,
      zone: key.zone ?? null,
      bedCount,
      metric,
      value,
      n,
      meta: meta ?? null,
      computedAt: now,
    });
  };

  const properties = db.select().from(t.properties).all();
  const listings = db.select().from(t.listings).all();
  const reports = db.select().from(t.studentReports).all();
  const ratings = db.select().from(t.appRatings).all();
  const surveyRows = db.select().from(t.surveys).all();
  const aiSummaries = db
    .select()
    .from(t.aiCache)
    .where(sql`${t.aiCache.type} = 'review_summary' and ${t.aiCache.propertyId} is not null`)
    .all();
  const history = db
    .select({
      propertyId: t.listingsHistory.propertyId,
      snapshotDate: t.listingsHistory.snapshotDate,
      baseRent: t.listingsHistory.baseRent,
    })
    .from(t.listingsHistory)
    .all();

  const sentimentByProperty = new Map<string, number>();
  for (const s of aiSummaries) {
    const out = s.output as { sentiment_score?: number } | null;
    if (out?.sentiment_score != null && s.propertyId) {
      sentimentByProperty.set(s.propertyId, out.sentiment_score);
    }
  }

  // Group helpers
  const groupBy = <T,>(items: T[], key: (x: T) => string | null): Map<string, T[]> => {
    const m = new Map<string, T[]>();
    for (const it of items) {
      const k = key(it);
      if (k == null) continue;
      (m.get(k) ?? m.set(k, []).get(k)!).push(it);
    }
    return m;
  };

  const listingsByProperty = groupBy(listings, (l) => l.propertyId);
  const reportsByProperty = groupBy(reports, (r) => r.propertyId);
  const ratingsByProperty = groupBy(ratings, (r) => r.propertyId);
  const surveysByProperty = groupBy(surveyRows, (s) => s.propertyId);
  const historyByProperty = groupBy(history, (h) => h.propertyId);

  // Eligibility filters
  const headlineListing = (l: typeof t.listings.$inferSelect) =>
    l.rentPerPerson != null && l.occupancy !== "shared";
  const sharedListing = (l: typeof t.listings.$inferSelect) =>
    l.rentPerPerson != null && l.occupancy === "shared";
  // NOTE: isOwnPlace=true means "reporting my own place" (the normal case,
  // ~94% of rows) — it is metadata, never an exclusion.
  const usableReport = (r: typeof t.studentReports.$inferSelect) =>
    r.rentPerPerson != null &&
    !r.outlierFlag &&
    !r.basisFlag;
  const recentReport = (r: typeof t.studentReports.$inferSelect) =>
    usableReport(r) && r.signingDate != null && r.signingDate >= cutoff;

  for (const p of properties) {
    const key = { propertyId: p.id };
    const pls = listingsByProperty.get(p.id) ?? [];
    const prs = reportsByProperty.get(p.id) ?? [];

    const bedCounts = new Set<number | null>([null]);
    for (const l of pls) if (l.beds != null) bedCounts.add(l.beds);
    for (const r of prs) if (r.beds != null) bedCounts.add(r.beds);

    let minListedMedian: number | null = null;

    for (const bed of bedCounts) {
      const inBed = <X extends { beds: number | null }>(x: X) =>
        bed === null || x.beds === bed;

      // Listed (headline: base rent, non-shared)
      const listedVals = pls
        .filter((l) => headlineListing(l) && inBed(l))
        .map((l) => l.rentPerPerson!) as number[];
      let listedMedian: number | null = null;
      if (listedVals.length > 0) {
        const s = summary(listedVals);
        listedMedian = s.median;
        push("property", key, bed, "listed_median", s.median, s.n);
        push("property", key, bed, "listed_mean", s.mean, s.n);
        push("property", key, bed, "listed_p25", s.p25, s.n);
        push("property", key, bed, "listed_p75", s.p75, s.n);
        push("property", key, bed, "listed_min", s.min, s.n);
        push("property", key, bed, "listed_max", s.max, s.n);
        if (bed !== null && (minListedMedian === null || s.median < minListedMedian)) {
          minListedMedian = s.median;
        }
      }

      // Reported (headline: 12-mo window, non-shared, non-ownPlace)
      const reportedVals = prs
        .filter((r) => recentReport(r) && !r.doubleOccupancy && inBed(r))
        .map((r) => r.rentPerPerson!) as number[];
      let reportedMedian: number | null = null;
      if (reportedVals.length > 0) {
        const s = summary(reportedVals);
        reportedMedian = s.median;
        push("property", key, bed, "reported_median", s.median, s.n);
        push("property", key, bed, "reported_mean", s.mean, s.n);
        push("property", key, bed, "reported_p25", s.p25, s.n);
        push("property", key, bed, "reported_p75", s.p75, s.n);
        push("property", key, bed, "reported_min", s.min, s.n);
        push("property", key, bed, "reported_max", s.max, s.n);
      }

      // Delta only when both sides have n>=3
      if (
        listedMedian != null &&
        reportedMedian != null &&
        listedVals.length >= 3 &&
        reportedVals.length >= 3
      ) {
        const n = Math.min(listedVals.length, reportedVals.length);
        push("property", key, bed, "delta_median", reportedMedian - listedMedian, n);
        push(
          "property",
          key,
          bed,
          "delta_pct",
          ((reportedMedian - listedMedian) / listedMedian) * 100,
          n
        );
      }

      // Shared occupancy — separate stat line
      const sharedListedRows = pls.filter((l) => sharedListing(l) && inBed(l));
      if (sharedListedRows.length > 0) {
        const vals = sharedListedRows.map((l) => l.rentPerPerson!) as number[];
        const withSqft = sharedListedRows.filter((l) => l.sqft);
        const perSqft =
          withSqft.length > 0
            ? withSqft.reduce((a, l) => a + l.rentPerPerson! / l.sqft!, 0) / withSqft.length
            : null;
        push(
          "property",
          key,
          bed,
          "shared_listed_avg",
          vals.reduce((a, b) => a + b, 0) / vals.length,
          vals.length,
          perSqft != null ? { avg_per_sqft: perSqft } : undefined
        );
      }
      const sharedReported = prs
        .filter((r) => recentReport(r) && r.doubleOccupancy && inBed(r))
        .map((r) => r.rentPerPerson!) as number[];
      if (sharedReported.length > 0) {
        push(
          "property",
          key,
          bed,
          "shared_reported_avg",
          sharedReported.reduce((a, b) => a + b, 0) / sharedReported.length,
          sharedReported.length
        );
      }

      // With-fees figure (separate basis, never blended)
      const feeVals = pls
        .filter(
          (l) =>
            inBed(l) &&
            l.totalPriceWithFees != null &&
            l.occupancy !== "shared" &&
            l.priceStatus !== "not_publicly_listed"
        )
        .map((l) =>
          l.pricingModel === "per_unit"
            ? l.totalPriceWithFees! / Math.max(l.beds ?? 1, 1)
            : l.totalPriceWithFees!
        );
      if (feeVals.length > 0) {
        const s = summary(feeVals);
        push("property", key, bed, "with_fees_median", s.median, s.n);
      }
    }

    // Bed-agnostic property metrics
    push("property", key, null, "report_count", prs.length, prs.length);

    const unknownBasisN = pls.filter(
      (l) => l.pricingModel === "unknown" && l.baseRent != null
    ).length;
    push("property", key, null, "listed_n_unknown_basis", unknownBasisN, unknownBasisN);

    if (minListedMedian != null) {
      push("property", key, null, "price_per_bedroom", minListedMedian, 1);
    }
    if (p.googleRating != null) {
      push("property", key, null, "google_rating", p.googleRating, p.googleRatingCount ?? 0);
    }
    if (p.distanceToCampusMi != null) {
      push("property", key, null, "distance_mi", p.distanceToCampusMi, 1);
    }

    const rr = ratingsByProperty.get(p.id) ?? [];
    if (rr.length > 0) {
      push(
        "property",
        key,
        null,
        "app_rating_avg",
        rr.reduce((a, r) => a + r.rating, 0) / rr.length,
        rr.length
      );
    }

    const sv = surveysByProperty.get(p.id) ?? [];
    const maint = sv.filter((s) => s.maintenanceRating != null);
    if (maint.length > 0) {
      push(
        "property",
        key,
        null,
        "maintenance_rating_avg",
        maint.reduce((a, s) => a + s.maintenanceRating!, 0) / maint.length,
        maint.length
      );
    }
    const uptime = sv.filter((s) => s.elevatorUptime != null);
    if (uptime.length > 0) {
      push(
        "property",
        key,
        null,
        "elevator_uptime_avg",
        uptime.reduce((a, s) => a + s.elevatorUptime!, 0) / uptime.length,
        uptime.length
      );
    }
    if (sv.length > 0) {
      const counts: Record<string, number> = {};
      for (const s of sv) for (const c of s.complaints ?? []) counts[c] = (counts[c] ?? 0) + 1;
      push("property", key, null, "complaint_counts", null, sv.length, counts);
    }

    const sent = sentimentByProperty.get(p.id);
    if (sent != null) {
      push("property", key, null, "sentiment", sent, prs.filter((r) => r.note).length);
    }

    // Reported-by-signing-year (ALL history, incl. shared/old — context table)
    const byYear = new Map<number, number[]>();
    for (const r of prs) {
      if (r.signingYear != null && r.rentPerPerson != null && !r.outlierFlag) {
        (byYear.get(r.signingYear) ?? byYear.set(r.signingYear, []).get(r.signingYear)!).push(
          r.rentPerPerson
        );
      }
    }
    if (byYear.size > 0) {
      const metaObj: Record<string, { median: number; n: number }> = {};
      for (const [year, vals] of byYear) {
        metaObj[year] = { median: summary(vals).median, n: vals.length };
      }
      push("property", key, null, "reported_by_year", null, prs.length, metaObj);
    }

    // Price trend from listings_history
    const hist = historyByProperty.get(p.id) ?? [];
    if (hist.length > 0) {
      const byDate = new Map<string, number[]>();
      for (const h of hist) {
        if (h.baseRent != null) {
          (byDate.get(h.snapshotDate) ?? byDate.set(h.snapshotDate, []).get(h.snapshotDate)!).push(
            h.baseRent
          );
        }
      }
      const trend = [...byDate.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, vals]) => ({ date, median: summary(vals).median, n: vals.length }));
      if (trend.length > 0) {
        push("property", key, null, "price_trend", trend[trend.length - 1].median, hist.length, trend);
      }
    }
  }

  // ---- Zone stats (core properties only) ----
  const coreProps = properties.filter((p) => p.isCore);
  const zoneOf = (p: (typeof properties)[number]) => p.zoneOverride ?? p.zone ?? "Other";
  const propsByZone = groupBy(coreProps, zoneOf);

  for (const [zone, zprops] of propsByZone) {
    const key = { zone };
    const ids = new Set(zprops.map((p) => p.id));
    const zoneListings = listings.filter((l) => ids.has(l.propertyId));
    const zoneReports = reports.filter((r) => r.propertyId && ids.has(r.propertyId));

    push("zone", key, null, "zone_property_count", zprops.length, zprops.length);
    push("zone", key, null, "zone_report_count", zoneReports.length, zoneReports.length);

    const beds = new Set<number | null>([null]);
    for (const l of zoneListings) if (l.beds != null) beds.add(l.beds);

    for (const bed of beds) {
      const inBed = <X extends { beds: number | null }>(x: X) =>
        bed === null || x.beds === bed;
      const lv = zoneListings
        .filter((l) => headlineListing(l) && inBed(l))
        .map((l) => l.rentPerPerson!) as number[];
      if (lv.length > 0) {
        const s = summary(lv);
        push("zone", key, bed, "zone_listed_median", s.median, s.n, {
          p25: s.p25,
          p75: s.p75,
        });
      }
      const rv = zoneReports
        .filter((r) => recentReport(r) && !r.doubleOccupancy && inBed(r))
        .map((r) => r.rentPerPerson!) as number[];
      if (rv.length > 0) {
        const s = summary(rv);
        push("zone", key, bed, "zone_reported_median", s.median, s.n, {
          p25: s.p25,
          p75: s.p75,
        });
      }
    }
  }

  // ---- Market stats (core only) ----
  const coreIds = new Set(coreProps.map((p) => p.id));
  const marketKey = { propertyId: null, zone: null };
  const coreListings = listings.filter((l) => coreIds.has(l.propertyId));
  const coreReports = reports.filter((r) => r.propertyId && coreIds.has(r.propertyId));

  const marketBeds = new Set<number>();
  for (const l of coreListings) if (l.beds != null) marketBeds.add(l.beds);

  for (const bed of marketBeds) {
    const vals = coreListings
      .filter((l) => headlineListing(l) && l.beds === bed)
      .map((l) => l.rentPerPerson!) as number[];
    if (vals.length === 0) continue;
    const s = summary(vals);
    // $50 histogram buckets
    const buckets: Record<string, number> = {};
    for (const v of vals) {
      const b = Math.floor(v / 50) * 50;
      buckets[b] = (buckets[b] ?? 0) + 1;
    }
    push("market", marketKey, bed, "market_listed_median", s.median, s.n, {
      p25: s.p25,
      p75: s.p75,
      histogram: buckets,
    });
  }

  const recentVals = coreReports
    .filter((r) => recentReport(r) && !r.doubleOccupancy)
    .map((r) => r.rentPerPerson!) as number[];
  if (recentVals.length > 0) {
    const s = summary(recentVals);
    push("market", marketKey, null, "market_reported_median", s.median, s.n);
  }

  // Distance-vs-price scatter (one point per core property)
  const scatter = coreProps
    .map((p) => {
      const pl = (listingsByProperty.get(p.id) ?? []).filter(headlineListing);
      if (pl.length === 0 || p.distanceToCampusMi == null) return null;
      const med = summary(pl.map((l) => l.rentPerPerson!)).median;
      return {
        id: p.id,
        name: p.canonicalName,
        distance: p.distanceToCampusMi,
        median: med,
        n: pl.length,
        zone: zoneOf(p),
      };
    })
    .filter(Boolean);
  push("market", marketKey, null, "distance_price_scatter", null, scatter.length, scatter);

  // KPI totals
  push("market", marketKey, null, "kpi_totals", null, 0, {
    coreProperties: coreProps.length,
    longTailProperties: properties.length - coreProps.length,
    listings: listings.length,
    reports: reports.length,
    reportsRecent: coreReports.filter(recentReport).length,
  });

  // Write
  db.delete(t.statsCache).run();
  const chunk = 500;
  for (let i = 0; i < rows.length; i += chunk) {
    db.insert(t.statsCache).values(rows.slice(i, i + chunk)).run();
  }
}
