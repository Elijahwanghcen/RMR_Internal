import { and, eq, isNull, sql, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import type { ChartSpec, ChartResult, ChartDataPoint } from "@/lib/charts/spec";
import { EntityResolver } from "@/lib/ingest/entityResolution";

export interface StatEntry {
  bedCount: number | null;
  metric: string;
  value: number | null;
  n: number;
  meta: unknown;
}

export function getPropertyStats(propertyId: string): StatEntry[] {
  const db = getDb();
  return db
    .select({
      bedCount: t.statsCache.bedCount,
      metric: t.statsCache.metric,
      value: t.statsCache.value,
      n: t.statsCache.n,
      meta: t.statsCache.meta,
    })
    .from(t.statsCache)
    .where(and(eq(t.statsCache.scope, "property"), eq(t.statsCache.propertyId, propertyId)))
    .all();
}

export function getZoneStats(): Array<StatEntry & { zone: string | null }> {
  const db = getDb();
  return db
    .select({
      zone: t.statsCache.zone,
      bedCount: t.statsCache.bedCount,
      metric: t.statsCache.metric,
      value: t.statsCache.value,
      n: t.statsCache.n,
      meta: t.statsCache.meta,
    })
    .from(t.statsCache)
    .where(eq(t.statsCache.scope, "zone"))
    .all();
}

export function getMarketStats(): StatEntry[] {
  const db = getDb();
  return db
    .select({
      bedCount: t.statsCache.bedCount,
      metric: t.statsCache.metric,
      value: t.statsCache.value,
      n: t.statsCache.n,
      meta: t.statsCache.meta,
    })
    .from(t.statsCache)
    .where(eq(t.statsCache.scope, "market"))
    .all();
}

/** Resolve loose property names from a chart spec to ids (alias-aware). */
export function resolvePropertyNames(names: string[]): Map<string, string> {
  const db = getDb();
  const props = db
    .select({ id: t.properties.id, canonicalName: t.properties.canonicalName, googleName: t.properties.googleName })
    .from(t.properties)
    .all();
  const aliasRows = db.select().from(t.aliases).all();
  const aliases: Record<string, string> = {};
  for (const a of aliasRows) aliases[a.aliasNorm] = a.propertyId;
  const resolver = new EntityResolver(props, aliases);
  const out = new Map<string, string>();
  for (const name of names) {
    const r = resolver.resolve(name);
    if (r.propertyId) out.set(name, r.propertyId);
  }
  return out;
}

// The single query engine used by the chart hub AND the Reddit composer.
export function runChartSpec(spec: ChartSpec): ChartResult {
  const db = getDb();
  const warnings: string[] = [];
  const minN = spec.filters.minN ?? 1;
  let data: ChartDataPoint[] = [];

  if (spec.groupBy === "property") {
    const conds = [eq(t.statsCache.scope, "property"), eq(t.statsCache.metric, spec.metric)];
    // bed filter: single bed -> that slice; none -> all-beds slice
    if (spec.filters.bedCounts && spec.filters.bedCounts.length === 1) {
      conds.push(eq(t.statsCache.bedCount, spec.filters.bedCounts[0]));
    } else if (spec.filters.bedCounts && spec.filters.bedCounts.length > 1) {
      conds.push(inArray(t.statsCache.bedCount, spec.filters.bedCounts));
    } else {
      conds.push(isNull(t.statsCache.bedCount));
    }
    const rows = db
      .select({
        propertyId: t.statsCache.propertyId,
        bedCount: t.statsCache.bedCount,
        value: t.statsCache.value,
        n: t.statsCache.n,
        name: t.properties.canonicalName,
        zone: sql<string>`coalesce(${t.properties.zoneOverride}, ${t.properties.zone})`,
        isCore: t.properties.isCore,
      })
      .from(t.statsCache)
      .innerJoin(t.properties, eq(t.statsCache.propertyId, t.properties.id))
      .where(and(...conds))
      .all();

    let filtered = rows.filter((r) => r.value != null && r.n >= minN);
    if (spec.filters.coreOnly !== false) filtered = filtered.filter((r) => r.isCore);
    if (spec.filters.zones?.length) {
      const zs = new Set(spec.filters.zones);
      filtered = filtered.filter((r) => zs.has(r.zone));
    }
    if (spec.filters.propertyNames?.length) {
      const resolved = resolvePropertyNames(spec.filters.propertyNames);
      const ids = new Set(resolved.values());
      const missed = spec.filters.propertyNames.filter((n) => !resolved.has(n));
      if (missed.length) warnings.push(`Unknown properties ignored: ${missed.join(", ")}`);
      filtered = filtered.filter((r) => r.propertyId && ids.has(r.propertyId));
    }

    // multiple bed counts for same property -> label with bed count
    const multiBed = (spec.filters.bedCounts?.length ?? 0) > 1;
    data = filtered.map((r) => ({
      id: r.propertyId ?? undefined,
      label: multiBed ? `${r.name} (${r.bedCount}br)` : r.name,
      value: r.value!,
      n: r.n,
      extra: { zone: r.zone, bedCount: r.bedCount },
    }));
  } else if (spec.groupBy === "zone") {
    const zoneMetric = spec.metric.startsWith("zone_")
      ? spec.metric
      : spec.metric === "listed_median"
        ? "zone_listed_median"
        : spec.metric === "reported_median"
          ? "zone_reported_median"
          : null;
    if (!zoneMetric) {
      warnings.push(`Metric ${spec.metric} is not available grouped by zone; using per-property average.`);
      // fall back: average of property values per zone
      const inner = runChartSpec({ ...spec, groupBy: "property" });
      const byZone = new Map<string, { sum: number; n: number; count: number }>();
      for (const p of inner.data) {
        const z = (p.extra?.zone as string) ?? "Other";
        const e = byZone.get(z) ?? { sum: 0, n: 0, count: 0 };
        e.sum += p.value;
        e.n += p.n;
        e.count += 1;
        byZone.set(z, e);
      }
      data = [...byZone.entries()].map(([zone, e]) => ({
        label: zone,
        value: e.sum / e.count,
        n: e.n,
      }));
    } else {
      const conds = [eq(t.statsCache.scope, "zone"), eq(t.statsCache.metric, zoneMetric)];
      if (spec.filters.bedCounts && spec.filters.bedCounts.length === 1) {
        conds.push(eq(t.statsCache.bedCount, spec.filters.bedCounts[0]));
      } else {
        conds.push(isNull(t.statsCache.bedCount));
      }
      const rows = db.select().from(t.statsCache).where(and(...conds)).all();
      data = rows
        .filter((r) => r.value != null && r.n >= minN)
        .filter((r) => !spec.filters.zones?.length || spec.filters.zones.includes(r.zone!))
        .map((r) => ({ label: r.zone!, value: r.value!, n: r.n }));
    }
  } else {
    // group by bed_count: market-wide or property-filtered
    if (spec.filters.propertyNames?.length === 1) {
      const resolved = resolvePropertyNames(spec.filters.propertyNames);
      const id = [...resolved.values()][0];
      if (!id) {
        warnings.push(`Unknown property: ${spec.filters.propertyNames[0]}`);
      } else {
        const rows = getPropertyStats(id).filter(
          (r) => r.metric === spec.metric && r.bedCount != null && r.n >= minN && r.value != null
        );
        data = rows.map((r) => ({ label: `${r.bedCount}br`, value: r.value!, n: r.n }));
      }
    } else {
      const marketMetric =
        spec.metric === "listed_median" ? "market_listed_median" : spec.metric;
      const rows = getMarketStats().filter(
        (r) => r.metric === marketMetric && r.bedCount != null && r.value != null && r.n >= minN
      );
      data = rows.map((r) => ({ label: `${r.bedCount}br`, value: r.value!, n: r.n }));
    }
  }

  if (spec.sort !== "none") {
    data.sort((a, b) => (spec.sort === "asc" ? a.value - b.value : b.value - a.value));
  } else if (spec.groupBy === "bed_count") {
    data.sort((a, b) => parseInt(a.label) - parseInt(b.label));
  }
  if (data.length > spec.limit) data = data.slice(0, spec.limit);

  const lowN = data.filter((d) => d.n < 3).length;
  if (lowN > 0) warnings.push(`${lowN} bars have n<3 (weak sample).`);

  return { spec, data, warnings };
}
