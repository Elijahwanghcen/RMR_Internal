# UT Austin Student Housing Intelligence Hub

Internal, single-user tool that turns three datasets into a fast answer engine for
UT Austin off-campus rent questions (levels.fyi-style: **listed price vs. what
students actually pay**). Built for a real-estate agent to answer any Reddit/client
housing question with grounded numbers in under a minute.

## Data sources
1. **Algolia** (live, refreshed once/day): `rentright_buildings` (142 core buildings,
   amenities + Google reviews) and `austin_leases_units` (~2,569 listings).
2. **`data/Raw_data.json`** — RateMyRent student submissions/ratings/surveys (~1,542
   self-reported rents + reviews).
3. **`/Users/elijahwangchen/FML_scraper/properties.csv`** — canonical 142-property list.

Offline dev falls back to `data/bundled/*.json`. The app pulls Algolia on the first
open of each Austin-local day, caches to `data/cache/`, and re-runs the pipeline;
same-day opens are a no-op.

## Setup
```bash
npm install
npm run ingest:offline   # build data/app.db from bundled dumps (no network)
npm run dev              # http://localhost:3000
```
`.env.local` holds the Algolia keys, `RAW_DATA_PATH`, and `CLAUDE_BIN` (the local
`claude` CLI — AI features shell out to it headless, no API key).

## Commands
- `npm run ingest` — live Algolia pull + full pipeline (falls back to cache/bundled).
- `npm run ingest:offline` — bundled dumps only.
- `npm test` — ingestion/matching/stats unit tests (the silent-bug surface).
- `npm run build` — production build.

## How the numbers are kept honest
- **Entity resolution**: normalize → exact → fuzzy (fuzzball token-set, ≥92 auto,
  78–91 → human review in Admin) → `aliases.json` overrides. Unmatched names become
  queryable long-tail properties, excluded from default dashboards.
- **Price basis**: headline = **base rent, per person, private occupancy**. Fees,
  shared-occupancy, and unknown-basis rows are tracked separately, never blended.
- **Recency**: reported-rent headline + the listed-vs-reported delta use only leases
  signed in the **last 12 months**; all history stays visible in a by-year table.
- **Outliers**: 1.5×IQR per (property, beds, occupancy) excluded from medians.
- **PII**: student notes are redacted (`lib/ingest/redact.ts`) before display AND
  before any AI prompt; the raw note never leaves the server.
- **Sample sizes**: every stat carries `n`; n<3 is grayed everywhere.

## AI (local `claude` CLI, no API key)
- **Chart hub** (`/charts`): Claude emits a constrained JSON *query spec* (never
  numbers); the app runs it against the stats layer.
- **Review summaries** (Admin → batch): per-property pros/cons/sentiment, cached,
  incremental. Completing the batch recomputes sentiment into `stats_cache`.
- **Reddit composer** (`/reddit`): retrieves stats+quotes into a DATA block, drafts
  a reply grounded only in it, then a regex **verifier** cross-checks every $/% in
  the draft against the data (mismatches flagged red). Includes a "copy Claude CLI
  command" button.

Note: the AI wrapper strips inherited `CLAUDE_CODE_*`/`ANTHROPIC_*` env vars so a
nested headless `claude -p` runs cleanly even when the dev server was launched from
inside a Claude Code session (`lib/ai/claudeCli.ts`).

## Stack
Next.js 16 (App Router) · SQLite via Drizzle + better-sqlite3 · Recharts ·
Leaflet/OSM · Tailwind + shadcn/ui · vitest.
