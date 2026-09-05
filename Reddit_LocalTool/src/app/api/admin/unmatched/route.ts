import { NextRequest, NextResponse } from "next/server";
import { bootstrap } from "@/lib/data/bootstrap";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import { eq } from "drizzle-orm";
import { loadAliases, saveAliases } from "@/lib/ingest/aliasesFile";
import { defaultPaths } from "@/lib/ingest/pipeline";
import { ensureFreshData } from "@/lib/ingest/refresh";

export async function GET() {
  await bootstrap();
  const db = getDb();
  const rows = db.select().from(t.unmatchedNames).all();
  const candidates = db
    .select({ id: t.properties.id, name: t.properties.canonicalName })
    .from(t.properties)
    .where(eq(t.properties.isCore, 1))
    .all();
  // annotate candidate name
  const byId = new Map(candidates.map((c) => [c.id, c.name]));
  return NextResponse.json({
    rows: rows.map((r) => ({
      ...r,
      bestCandidateName: r.bestCandidateId ? byId.get(r.bestCandidateId) ?? null : null,
    })),
    candidates,
  });
}

// action: alias (map raw name -> property), long_tail, ignore
export async function POST(req: NextRequest) {
  const { rawName, action, propertyId } = (await req.json()) as {
    rawName?: string;
    action?: "alias" | "long_tail" | "ignore";
    propertyId?: string;
  };
  if (!rawName || !action) {
    return NextResponse.json({ error: "rawName and action required" }, { status: 400 });
  }
  const { dataDir } = defaultPaths();

  if (action === "alias") {
    if (!propertyId) return NextResponse.json({ error: "propertyId required" }, { status: 400 });
    const aliases = loadAliases(dataDir);
    aliases[rawName] = propertyId; // keyed by raw text; pipeline normalizes on load
    saveAliases(dataDir, aliases);
  }

  // update the unmatched row status; a re-ingest applies aliases
  const db = getDb();
  const status = action === "alias" ? "aliased" : action === "ignore" ? "ignored" : "long_tail";
  db.update(t.unmatchedNames)
    .set({ status })
    .where(eq(t.unmatchedNames.rawName, rawName))
    .run();

  // aliases only take effect after re-resolution
  if (action === "alias") await ensureFreshData(true);
  return NextResponse.json({ ok: true, status });
}
