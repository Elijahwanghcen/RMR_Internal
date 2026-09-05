import { getDb, type Db } from "@/db/client";
import * as t from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  fetchAllHits,
  writeSnapshot,
  latestSnapshot,
  readBundled,
  pruneSnapshots,
  BUILDINGS_INDEX,
  UNITS_INDEX,
} from "./algolia";
import { runPipeline, defaultPaths, type IngestReport } from "./pipeline";

// Once-per-day refresh, keyed to the local Austin calendar day.
export function todayChicago(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getMeta(db: Db, key: string): string | null {
  const row = db.select().from(t.meta).where(eq(t.meta.key, key)).get();
  return row?.value ?? null;
}

export interface RefreshResult {
  refreshed: boolean;
  source: string;
  date: string;
  report?: IngestReport;
  error?: string;
}

async function doRefresh(force: boolean): Promise<RefreshResult> {
  const db = getDb();
  const today = todayChicago();
  const last = getMeta(db, "last_refresh_date");
  if (!force && last === today) {
    return { refreshed: false, source: getMeta(db, "last_refresh_source") ?? "unknown", date: last };
  }

  const paths = defaultPaths();
  let buildingsRaw: unknown[];
  let unitsRaw: unknown[];
  let source: string;
  let snapshotDate = today;

  try {
    [buildingsRaw, unitsRaw] = await Promise.all([
      fetchAllHits(BUILDINGS_INDEX),
      fetchAllHits(UNITS_INDEX),
    ]);
    writeSnapshot(paths.dataDir, BUILDINGS_INDEX, today, buildingsRaw);
    writeSnapshot(paths.dataDir, UNITS_INDEX, today, unitsRaw);
    pruneSnapshots(paths.dataDir);
    source = "algolia";
  } catch (err) {
    // Offline / Algolia failure: newest snapshot, else bundled dumps.
    const b = latestSnapshot(paths.dataDir, BUILDINGS_INDEX);
    const u = latestSnapshot(paths.dataDir, UNITS_INDEX);
    if (b && u) {
      buildingsRaw = b.hits;
      unitsRaw = u.hits;
      snapshotDate = u.date;
      source = "cache_fallback";
    } else {
      buildingsRaw = readBundled(paths.dataDir, BUILDINGS_INDEX);
      unitsRaw = readBundled(paths.dataDir, UNITS_INDEX);
      source = "bundled";
    }
    console.warn(`Algolia fetch failed (${(err as Error).message}); using ${source}`);
  }

  const report = runPipeline(db, {
    buildingsRaw,
    unitsRaw,
    snapshotDate,
    source,
    dataDir: paths.dataDir,
    rawDataPath: paths.rawDataPath,
    propertiesCsvPath: paths.propertiesCsvPath,
  });

  return { refreshed: true, source, date: snapshotDate, report };
}

// Singleton promise on globalThis: one refresh even under parallel requests
// and Next dev hot-reload module duplication.
const g = globalThis as unknown as { __utRefresh?: Promise<RefreshResult> };

export function ensureFreshData(force = false): Promise<RefreshResult> {
  if (force) {
    g.__utRefresh = undefined;
  }
  if (!g.__utRefresh) {
    g.__utRefresh = doRefresh(force).finally(() => {
      // allow a later same-process day rollover / force to re-run
      setTimeout(() => {
        g.__utRefresh = undefined;
      }, 5_000);
    });
  }
  return g.__utRefresh;
}

export function refreshStatus() {
  const db = getDb();
  const reportJson = getMeta(db, "ingest_report");
  return {
    lastRefreshDate: getMeta(db, "last_refresh_date"),
    lastRefreshSource: getMeta(db, "last_refresh_source"),
    report: reportJson ? (JSON.parse(reportJson) as IngestReport) : null,
  };
}
