import { and, eq, desc, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import { getPropertyStats, type StatEntry } from "@/lib/stats/query";
import { EntityResolver } from "@/lib/ingest/entityResolution";

export interface PropertyListItem {
  id: string;
  canonicalName: string;
  zone: string | null;
  isCore: boolean;
  distanceToCampusMi: number | null;
  googleRating: number | null;
  listedMedian: number | null;
  listedN: number;
  reportedMedian: number | null;
  reportedN: number;
  reportCount: number;
}

export function listProperties(opts?: { coreOnly?: boolean; zone?: string }): PropertyListItem[] {
  const db = getDb();
  const props = db
    .select()
    .from(t.properties)
    .where(opts?.coreOnly ? eq(t.properties.isCore, 1) : undefined)
    .all();

  const stats = db
    .select()
    .from(t.statsCache)
    .where(and(eq(t.statsCache.scope, "property"), sql`${t.statsCache.bedCount} is null`))
    .all();
  const byProp = new Map<string, Map<string, (typeof stats)[number]>>();
  for (const s of stats) {
    if (!s.propertyId) continue;
    (byProp.get(s.propertyId) ?? byProp.set(s.propertyId, new Map()).get(s.propertyId)!).set(
      s.metric,
      s
    );
  }

  let items = props.map((p) => {
    const m = byProp.get(p.id);
    const zone = p.zoneOverride ?? p.zone;
    return {
      id: p.id,
      canonicalName: p.canonicalName,
      zone,
      isCore: !!p.isCore,
      distanceToCampusMi: p.distanceToCampusMi,
      googleRating: p.googleRating,
      listedMedian: m?.get("listed_median")?.value ?? null,
      listedN: m?.get("listed_median")?.n ?? 0,
      reportedMedian: m?.get("reported_median")?.value ?? null,
      reportedN: m?.get("reported_median")?.n ?? 0,
      reportCount: m?.get("report_count")?.n ?? 0,
    };
  });
  if (opts?.zone) items = items.filter((i) => i.zone === opts.zone);
  return items.sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
}

export interface ProfileBundle {
  property: typeof t.properties.$inferSelect;
  stats: StatEntry[];
  listings: (typeof t.listings.$inferSelect)[];
  reports: (typeof t.studentReports.$inferSelect)[];
  googleReviews: (typeof t.googleReviews.$inferSelect)[];
  surveys: (typeof t.surveys.$inferSelect)[];
  appRatings: (typeof t.appRatings.$inferSelect)[];
  aiSummary: unknown | null;
}

export function getProfile(id: string): ProfileBundle | null {
  const db = getDb();
  const property = db.select().from(t.properties).where(eq(t.properties.id, id)).get();
  if (!property) return null;
  const reports = db
    .select()
    .from(t.studentReports)
    .where(eq(t.studentReports.propertyId, id))
    .orderBy(desc(t.studentReports.createdAt))
    .all()
    // raw note must never leave the server
    .map((r) => ({ ...r, noteRaw: null }));
  const aiRow = db
    .select()
    .from(t.aiCache)
    .where(and(eq(t.aiCache.type, "review_summary"), eq(t.aiCache.propertyId, id)))
    .orderBy(desc(t.aiCache.createdAt))
    .get();
  return {
    property,
    stats: getPropertyStats(id),
    listings: db.select().from(t.listings).where(eq(t.listings.propertyId, id)).all(),
    reports,
    googleReviews: db
      .select()
      .from(t.googleReviews)
      .where(eq(t.googleReviews.propertyId, id))
      .all(),
    surveys: db.select().from(t.surveys).where(eq(t.surveys.propertyId, id)).all(),
    appRatings: db.select().from(t.appRatings).where(eq(t.appRatings.propertyId, id)).all(),
    aiSummary: aiRow?.output ?? null,
  };
}

export interface SearchHit {
  id: string;
  name: string;
  zone: string | null;
  isCore: boolean;
  score: number;
}

export function searchProperties(q: string, limit = 12): SearchHit[] {
  const db = getDb();
  const props = db
    .select({
      id: t.properties.id,
      canonicalName: t.properties.canonicalName,
      googleName: t.properties.googleName,
      zone: sql<string | null>`coalesce(${t.properties.zoneOverride}, ${t.properties.zone})`,
      isCore: t.properties.isCore,
    })
    .from(t.properties)
    .all();
  if (!q.trim()) {
    return props
      .filter((p) => p.isCore)
      .slice(0, limit)
      .map((p) => ({ id: p.id, name: p.canonicalName, zone: p.zone, isCore: true, score: 0 }));
  }
  const aliasRows = db.select().from(t.aliases).all();
  const aliases: Record<string, string> = {};
  for (const a of aliasRows) aliases[a.aliasNorm] = a.propertyId;
  const resolver = new EntityResolver(props, aliases);
  const direct = resolver.resolve(q);

  // substring + fuzzy ranking
  const ql = q.toLowerCase();
  const scored = props.map((p) => {
    let score = 0;
    const name = p.canonicalName.toLowerCase();
    if (p.id === direct.propertyId) score = 200;
    else if (name.startsWith(ql)) score = 150;
    else if (name.includes(ql)) score = 100;
    else {
      // cheap token overlap
      const qTokens = ql.split(/\s+/);
      score = qTokens.filter((tk) => name.includes(tk)).length * 30;
    }
    return { p, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || Number(b.p.isCore) - Number(a.p.isCore))
    .slice(0, limit)
    .map(({ p, score }) => ({
      id: p.id,
      name: p.canonicalName,
      zone: p.zone,
      isCore: !!p.isCore,
      score,
    }));
}
