import { NextResponse } from "next/server";
import { bootstrap } from "@/lib/data/bootstrap";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";

export async function GET() {
  await bootstrap();
  const db = getDb();
  const props = db
    .select()
    .from(t.properties)
    .where(eq(t.properties.isCore, 1))
    .all()
    .filter((p) => p.lat != null && p.lng != null);

  const stats = db
    .select()
    .from(t.statsCache)
    .where(
      and(
        eq(t.statsCache.scope, "property"),
        eq(t.statsCache.metric, "listed_median"),
        isNull(t.statsCache.bedCount)
      )
    )
    .all();
  const medianById = new Map(stats.map((s) => [s.propertyId, s.value]));

  const pins = props.map((p) => ({
    id: p.id,
    name: p.canonicalName,
    lat: p.lat,
    lng: p.lng,
    zone: p.zoneOverride ?? p.zone,
    median: medianById.get(p.id) ?? null,
    googleRating: p.googleRating,
  }));
  return NextResponse.json({ pins });
}
