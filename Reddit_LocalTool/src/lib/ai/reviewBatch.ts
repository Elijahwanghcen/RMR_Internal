import crypto from "crypto";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import { runClaudeJson, enqueue } from "./claudeCli";
import { buildReviewSummaryPrompt, COMPLAINT_VOCAB, type ReviewInput } from "./prompts/reviewSummary";
import { computeAllStats } from "@/lib/stats/compute";

const summarySchema = z.object({
  summary: z.string(),
  pros: z.array(z.string()).max(8),
  cons: z.array(z.string()).max(8),
  sentiment_score: z.number().min(-1).max(1),
  complaint_tags: z.array(z.enum(COMPLAINT_VOCAB)).default([]),
});

export type ReviewSummary = z.infer<typeof summarySchema>;

interface BatchState {
  running: boolean;
  total: number;
  done: number;
  skipped: number;
  failed: number;
  currentProperty: string | null;
  startedAt: number | null;
  finishedAt: number | null;
  errors: string[];
}

const g = globalThis as unknown as { __utBatch?: BatchState };

export function batchStatus(): BatchState {
  return (
    g.__utBatch ?? {
      running: false,
      total: 0,
      done: 0,
      skipped: 0,
      failed: 0,
      currentProperty: null,
      startedAt: null,
      finishedAt: null,
      errors: [],
    }
  );
}

function gatherReviews(propertyId: string): {
  reviews: ReviewInput[];
  tallies: Record<string, number>;
} {
  const db = getDb();
  const notes = db
    .select()
    .from(t.studentReports)
    .where(eq(t.studentReports.propertyId, propertyId))
    .all()
    .filter((r) => r.note && r.note.trim().length > 3);
  const gReviews = db
    .select()
    .from(t.googleReviews)
    .where(eq(t.googleReviews.propertyId, propertyId))
    .all()
    .filter((r) => r.text && r.text.trim().length > 3);
  const sv = db.select().from(t.surveys).where(eq(t.surveys.propertyId, propertyId)).all();
  const tallies: Record<string, number> = {};
  for (const s of sv) for (const c of s.complaints ?? []) tallies[c] = (tallies[c] ?? 0) + 1;
  return {
    reviews: [
      ...notes.map((r) => ({ id: r.id, source: "student" as const, text: r.note! })),
      ...gReviews.map((r) => ({
        id: r.id,
        source: "google" as const,
        text: r.text!,
        rating: r.rating,
      })),
    ],
    tallies,
  };
}

export function summaryCacheKey(propertyId: string, reviews: ReviewInput[]): string {
  const h = crypto.createHash("sha256");
  h.update(propertyId);
  for (const r of reviews) h.update(`${r.id}|${r.text}`);
  return `review_summary:${h.digest("hex")}`;
}

export async function summarizeProperty(propertyId: string): Promise<"done" | "skipped" | "empty"> {
  const db = getDb();
  const { reviews, tallies } = gatherReviews(propertyId);
  if (reviews.length === 0) return "empty";
  const key = summaryCacheKey(propertyId, reviews);
  const existing = db.select().from(t.aiCache).where(eq(t.aiCache.key, key)).get();
  if (existing) return "skipped";

  const prop = db.select().from(t.properties).where(eq(t.properties.id, propertyId)).get();
  const prompt = buildReviewSummaryPrompt(prop?.canonicalName ?? propertyId, reviews, tallies);
  const output = await runClaudeJson({ prompt, schema: summarySchema });

  db.transaction((tx) => {
    // one live summary per property: clear older entries for this property
    tx.delete(t.aiCache)
      .where(and(eq(t.aiCache.type, "review_summary"), eq(t.aiCache.propertyId, propertyId)))
      .run();
    tx.insert(t.aiCache)
      .values({
        key,
        type: "review_summary",
        propertyId,
        output,
        model: "sonnet",
        createdAt: Date.now(),
      })
      .run();
  });
  return "done";
}

/** Run the batch over all properties with any review text. Resumable via cache keys. */
export async function runSummaryBatch(propertyIds?: string[]): Promise<BatchState> {
  const state = batchStatus();
  if (state.running) return state;

  const db = getDb();
  const ids =
    propertyIds ??
    db
      .select({ id: t.properties.id })
      .from(t.properties)
      .all()
      .map((r) => r.id);

  const fresh: BatchState = {
    running: true,
    total: ids.length,
    done: 0,
    skipped: 0,
    failed: 0,
    currentProperty: null,
    startedAt: Date.now(),
    finishedAt: null,
    errors: [],
  };
  g.__utBatch = fresh;

  (async () => {
    for (const id of ids) {
      fresh.currentProperty = id;
      try {
        const res = await enqueue(() => summarizeProperty(id));
        if (res === "done") fresh.done++;
        else fresh.skipped++;
      } catch (err) {
        fresh.failed++;
        fresh.errors.push(`${id}: ${(err as Error).message}`);
        if (fresh.errors.length > 20) fresh.errors.shift();
      }
    }
    fresh.running = false;
    fresh.currentProperty = null;
    fresh.finishedAt = Date.now();
    // sentiment feeds stats_cache — recompute now that summaries changed
    try {
      computeAllStats(getDb());
    } catch (err) {
      fresh.errors.push(`stats recompute: ${(err as Error).message}`);
    }
  })();

  return fresh;
}
