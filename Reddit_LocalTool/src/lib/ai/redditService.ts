import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import { runClaudeJson } from "./claudeCli";
import {
  buildRedditDraftPrompt,
  buildEntityExtractPrompt,
  type RedditDataBlock,
} from "./prompts/redditDraft";
import { verifyDraft, type VerifyResult } from "./verify";
import { normalizeName } from "@/lib/ingest/normalize";
import { zoneNames } from "@/lib/geo/zones";
import { getPropertyStats, getMarketStats } from "@/lib/stats/query";
import { metricLabel } from "@/lib/stats/metrics";

export interface RedditDraftResult {
  draft: string;
  cited: Array<{ value: number; context: string }>;
  entities: { properties: Array<{ id: string; name: string }>; zones: string[]; bedCounts: number[] };
  data: RedditDataBlock;
  verification: VerifyResult;
}

const extractSchema = z.object({
  properties: z.array(z.string()).default([]),
  zones: z.array(z.string()).default([]),
  bedCounts: z.array(z.number().int().min(0).max(10)).default([]),
  intent: z.string().default(""),
});

const draftSchema = z.object({
  draft: z.string().min(1),
  cited: z.array(z.object({ value: z.number(), context: z.string() })).default([]),
});

/** Local-first entity scan: property names/aliases + zone keywords + bed patterns. */
export function localExtract(question: string): {
  propertyIds: Set<string>;
  zones: string[];
  bedCounts: number[];
} {
  const db = getDb();
  const props = db
    .select({ id: t.properties.id, canonicalName: t.properties.canonicalName, normName: t.properties.normName, isCore: t.properties.isCore })
    .from(t.properties)
    .all();
  const aliasRows = db.select().from(t.aliases).all();
  const qNorm = ` ${normalizeName(question)} `;

  const propertyIds = new Set<string>();
  for (const p of props) {
    // require 2+ chars and word-ish containment of the full normalized name
    if (p.normName.length >= 4 && qNorm.includes(` ${p.normName} `)) propertyIds.add(p.id);
  }
  for (const a of aliasRows) {
    if (a.aliasNorm.length >= 4 && qNorm.includes(` ${a.aliasNorm} `)) propertyIds.add(a.propertyId);
  }

  const zones = zoneNames().filter((z) => qNorm.includes(normalizeName(z)));

  const bedCounts: number[] = [];
  const bedRe = /(\d+)\s*(?:x\s*\d+|br|bed|bedroom)/gi;
  let m: RegExpExecArray | null;
  while ((m = bedRe.exec(question))) {
    const b = parseInt(m[1], 10);
    if (b >= 0 && b <= 10 && !bedCounts.includes(b)) bedCounts.push(b);
  }
  if (/\bstudio\b/i.test(question) && !bedCounts.includes(0)) bedCounts.push(0);

  return { propertyIds, zones, bedCounts };
}

function buildDataBlock(
  propertyIds: string[],
  zones: string[],
  bedCounts: number[]
): RedditDataBlock {
  const db = getDb();

  // zone-implied properties: top by report count in that zone (cap 6)
  if (propertyIds.length === 0 && zones.length > 0) {
    const zprops = db
      .select()
      .from(t.properties)
      .all()
      .filter((p) => p.isCore && zones.includes(p.zoneOverride ?? p.zone ?? ""));
    const withCounts = zprops.map((p) => ({
      p,
      n: getPropertyStats(p.id).find((s) => s.metric === "report_count")?.n ?? 0,
    }));
    withCounts.sort((a, b) => b.n - a.n);
    propertyIds = withCounts.slice(0, 6).map((w) => w.p.id);
  }

  const wantBed = (bed: number | null) =>
    bed === null || bedCounts.length === 0 || bedCounts.includes(bed);

  const properties = propertyIds.map((id) => {
    const p = db.select().from(t.properties).where(eq(t.properties.id, id)).get()!;
    const stats = getPropertyStats(id)
      .filter(
        (s) =>
          s.value != null &&
          wantBed(s.bedCount) &&
          [
            "listed_median",
            "reported_median",
            "delta_median",
            "shared_listed_avg",
            "shared_reported_avg",
            "with_fees_median",
            "app_rating_avg",
            "maintenance_rating_avg",
            "report_count",
          ].includes(s.metric)
      )
      .map((s) => ({
        label: `${s.bedCount != null ? `${s.bedCount}br ` : ""}${metricLabel(s.metric)}`,
        value: Math.round(s.value! * 10) / 10,
        n: s.n,
      }));
    const listings = db.select().from(t.listings).where(eq(t.listings.propertyId, id)).all();
    const concessions = [
      ...new Set(listings.map((l) => l.concessionsRaw).filter((c): c is string => !!c)),
    ].slice(0, 3);
    const quotes = db
      .select()
      .from(t.studentReports)
      .where(eq(t.studentReports.propertyId, id))
      .all()
      .filter((r) => r.note && r.note.trim().length > 20 && !r.outlierFlag)
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, 5)
      .map((r) => ({ id: r.id, text: r.note! }));
    const ai = db
      .select()
      .from(t.aiCache)
      .where(eq(t.aiCache.propertyId, id))
      .all()
      .find((c) => c.type === "review_summary");
    return {
      name: p.canonicalName,
      zone: p.zoneOverride ?? p.zone,
      distanceMi: p.distanceToCampusMi != null ? Math.round(p.distanceToCampusMi * 100) / 100 : null,
      googleRating: p.googleRating,
      stats,
      concessions,
      quotes,
      aiSummary: (ai?.output ?? null) as RedditDataBlock["properties"][number]["aiSummary"],
    };
  });

  const market = getMarketStats()
    .filter(
      (s) =>
        s.value != null &&
        (s.metric === "market_reported_median" ||
          (s.metric === "market_listed_median" && wantBed(s.bedCount)))
    )
    .map((s) => ({
      label: `${s.bedCount != null ? `${s.bedCount}br ` : ""}${s.metric.replace(/_/g, " ")}`,
      value: Math.round(s.value!),
      n: s.n,
    }));

  return { properties, market };
}

export async function draftRedditReply(
  question: string,
  tone: "casual" | "neutral" = "casual"
): Promise<RedditDraftResult> {
  const db = getDb();
  const local = localExtract(question);
  let propertyIds = [...local.propertyIds];
  let zones = local.zones;
  const bedCounts = local.bedCounts;

  // LLM fallback only when the local scan found nothing to anchor on
  if (propertyIds.length === 0 && zones.length === 0) {
    const names = db
      .select({ name: t.properties.canonicalName, isCore: t.properties.isCore })
      .from(t.properties)
      .all()
      .filter((p) => p.isCore)
      .map((p) => p.name);
    const extracted = await runClaudeJson({
      prompt: buildEntityExtractPrompt(question, names, zoneNames()),
      schema: extractSchema,
      model: "haiku",
      timeoutMs: 60_000,
    });
    const byName = new Map(
      db
        .select({ id: t.properties.id, name: t.properties.canonicalName })
        .from(t.properties)
        .all()
        .map((p) => [p.name, p.id])
    );
    propertyIds = extracted.properties
      .map((n) => byName.get(n))
      .filter((id): id is string => !!id);
    zones = extracted.zones.filter((z) => zoneNames().includes(z));
    for (const b of extracted.bedCounts) if (!bedCounts.includes(b)) bedCounts.push(b);
  }

  const data = buildDataBlock(propertyIds.slice(0, 6), zones, bedCounts);
  const out = await runClaudeJson({
    prompt: buildRedditDraftPrompt(question, data, tone),
    schema: draftSchema,
    timeoutMs: 150_000,
  });

  const verification = verifyDraft(out.draft, data);
  const propRows = propertyIds
    .slice(0, 6)
    .map((id) => db.select().from(t.properties).where(eq(t.properties.id, id)).get())
    .filter((p): p is NonNullable<typeof p> => !!p);

  return {
    draft: out.draft,
    cited: out.cited,
    entities: {
      properties: propRows.map((p) => ({ id: p.id, name: p.canonicalName })),
      zones,
      bedCounts,
    },
    data,
    verification,
  };
}
