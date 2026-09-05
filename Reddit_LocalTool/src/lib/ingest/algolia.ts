import fs from "fs";
import path from "path";

// Search-only key: browse API is unavailable, so page through empty-query
// searches. paginationLimitedTo=5000 comfortably covers both indexes; if
// austin_leases_units ever exceeds 5000, partition fetches by
// property_objectID facet instead.

const APP_ID = process.env.ALGOLIA_APP_ID ?? "Z9GSMS5XJY";
const SEARCH_KEY = process.env.ALGOLIA_SEARCH_KEY ?? "";

export const BUILDINGS_INDEX = "rentright_buildings";
export const UNITS_INDEX = "austin_leases_units";

async function queryPage(index: string, page: number, hitsPerPage: number) {
  const res = await fetch(
    `https://${APP_ID}-dsn.algolia.net/1/indexes/${index}/query`,
    {
      method: "POST",
      headers: {
        "X-Algolia-API-Key": SEARCH_KEY,
        "X-Algolia-Application-Id": APP_ID,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        params: `query=&hitsPerPage=${hitsPerPage}&page=${page}`,
      }),
      signal: AbortSignal.timeout(30_000),
    }
  );
  if (!res.ok) {
    throw new Error(`Algolia ${index} page ${page}: HTTP ${res.status}`);
  }
  return (await res.json()) as {
    hits: Record<string, unknown>[];
    nbPages: number;
  };
}

export async function fetchAllHits(index: string): Promise<Record<string, unknown>[]> {
  const hitsPerPage = 1000;
  const first = await queryPage(index, 0, hitsPerPage);
  const all = [...first.hits];
  for (let page = 1; page < first.nbPages; page++) {
    const next = await queryPage(index, page, hitsPerPage);
    all.push(...next.hits);
  }
  // Strip Algolia search metadata; keep the record fields only.
  return all.map((h) => {
    const { _highlightResult: _hl, ...rest } = h as Record<string, unknown> & {
      _highlightResult?: unknown;
    };
    return rest;
  });
}

export function snapshotPath(dataDir: string, index: string, date: string): string {
  return path.join(dataDir, "cache", `${index}-${date}.json`);
}

export function writeSnapshot(
  dataDir: string,
  index: string,
  date: string,
  hits: unknown[]
): void {
  const p = snapshotPath(dataDir, index, date);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(hits));
}

/** Newest snapshot file for an index, or null. */
export function latestSnapshot(
  dataDir: string,
  index: string
): { date: string; hits: unknown[] } | null {
  const dir = path.join(dataDir, "cache");
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(`${index}-`) && f.endsWith(".json"))
    .sort();
  const latest = files[files.length - 1];
  if (!latest) return null;
  const date = latest.slice(index.length + 1, -5);
  return { date, hits: JSON.parse(fs.readFileSync(path.join(dir, latest), "utf8")) };
}

export function readBundled(dataDir: string, index: string): unknown[] {
  const file =
    index === BUILDINGS_INDEX ? "algolia_properties.json" : "algolia_units.json";
  return JSON.parse(fs.readFileSync(path.join(dataDir, "bundled", file), "utf8"));
}

/** Keep the newest `keep` snapshot files per index; prune older ones. */
export function pruneSnapshots(dataDir: string, keep = 60): void {
  const dir = path.join(dataDir, "cache");
  if (!fs.existsSync(dir)) return;
  for (const index of [BUILDINGS_INDEX, UNITS_INDEX]) {
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith(`${index}-`) && f.endsWith(".json"))
      .sort();
    for (const f of files.slice(0, Math.max(0, files.length - keep))) {
      fs.rmSync(path.join(dir, f));
    }
  }
}
