# Spec: UT Austin Student Housing Intelligence Hub (Internal Tool)

## 1. Purpose & Vision

An internal, single-user (or small-team) web tool that turns three raw datasets about off-campus housing near UT Austin into a fast, trustworthy answer engine — in the spirit of levels.fyi, but for student rent. The primary workflow: someone reads a housing question on Reddit (r/UTAustin, r/Austin, etc.), opens this tool, pulls accurate numbers and student sentiment in under a minute, and composes a helpful, data-backed reply.

The tool is NOT public-facing. It does not need auth beyond a simple gate, does not need to scale, and should optimize for speed of insight over polish.

### Success criteria
- Any of the ~142 core properties can be looked up in <5 seconds with pre-computed stats visible immediately.
- "Listed price vs. what students actually pay" is a first-class, always-visible comparison (this is the levels.fyi-style differentiator).
- An AI assistant inside the tool can generate new charts from natural-language prompts and draft Reddit-ready responses grounded ONLY in this data.

---

## 2. Input Data (three files)

1. **properties.csv** (~143 rows) — the canonical property list. Columns include: property name, address, GPS lat/long, and amenities. This is the source of truth for which properties matter most.
2. **listings sheet** (2,500+ rows) — publicly available listings with prices (assumed columns: property, floorplan/unit type, beds, baths, sqft, listed price, date scraped/collected).
3. **student responses sheet** (1,500+ rows) — self-reported data: what the student pays, and a free-text review of the property. Contains many properties NOT in properties.csv (long tail).

### Critical data engineering requirement: entity resolution
Property names will not match cleanly across the three files ("The Castilian" vs "Castilian" vs "castillian apts"). The build must include:
- A normalization/matching pipeline (lowercase, strip "the"/"apartments"/"apts", fuzzy matching e.g. token-set ratio, with a manual alias-mapping file `aliases.json` for overrides).
- A review step that outputs unmatched names for human confirmation before they're merged or discarded.
- Long-tail properties from the student sheet that aren't in properties.csv should still be queryable, but flagged as "non-core" and excluded from default dashboards.

### Data hygiene
- Outlier detection on self-reported rent (e.g., flag values outside 1.5×IQR per property/bed-count so a typo like $12,000/mo doesn't poison medians).
- Normalize price basis: per-person vs per-unit rent must be reconciled (see Open Questions). Store both `rent_reported` and `rent_per_person_normalized` where derivable from bed count.
- Timestamps matter: listings and reviews should carry dates so stats can be filtered to "last 12 months."

---

## 3. Core Features

### 3.1 Property profile pages (the workhorse)
One page per core property showing:
- Header: name, address, distance to campus (haversine from GPS to UT Tower: 30.2862, -97.7394), amenities chips.
- **Price panel**: median/p25/p75 listed price by bed count; median/p25/p75 student-reported rent by bed count; the delta between them ("students report paying ~$180 less than listed 2br prices").
- **Review panel**: count of student responses, AI-generated summary of themes (pros/cons), and the raw quotes browsable below.
- Sample-size badges everywhere (n=3 medians must be visibly weak; hide or gray out stats with n<3).

### 3.2 Pre-computed statistics layer
Computed at data-load time (not per request) and cached:
- Per property × bed count: median/mean/p25/p75/min/max for both listed and reported rent, sample sizes, listed-vs-reported delta.
- Market-wide: rent distributions by bed count, price per bedroom rankings, cheapest/most expensive by segment, distance-to-campus vs price scatter data.
- By neighborhood/zone (West Campus, North Campus, Riverside, Far West, etc. — derive from GPS or a zone column): median rents, property counts.
- Review-derived: sentiment score per property (simple positive/negative classification via LLM batch job, cached), most-mentioned complaint categories (management, maintenance, noise, pests, parking, safety).

### 3.3 AI chart hub ("dynamic hub")
- A chat-style panel where the user types e.g. "bar chart of median 4br per-person rent in West Campus, sorted ascending" and gets a rendered chart.
- Implementation: LLM translates the prompt into a constrained JSON chart spec (chart type, metric, filters, group-by) → the app runs the query against the stats layer → renders with a chart library. The LLM never invents numbers; it only produces query specs.
- Charts are saveable to a pinned "boards" area and exportable as PNG (for pasting into Reddit via image hosts if desired).

### 3.4 Reddit response composer
- Paste a Reddit question → tool identifies which properties/segments are relevant → drafts a reply using ONLY retrieved stats and quotes, with sample sizes included ("based on 14 student reports, median 2br at X is ~$1,450/person").
- Tone controls: casual Reddit voice, no marketing-speak, always caveats small samples.
- Every number in the draft must be traceable — show the underlying rows/stats next to the draft so the human can verify before posting.
- add a button that allows claude to drum up a suggested response by auto opening a claude CLI and inputing the nessesary information into a potential sentence that could be used in the responce.

### 3.5 Search, compare, map
- Global fuzzy search across all properties (core + long tail).
- Compare view: select 2–5 properties side by side (price, delta, sentiment, distance, amenities).
- Map view: pins for all core properties, color-coded by median per-person rent, click-through to profiles.

### 3.6 Data admin
- Re-upload/replace any of the three CSVs; pipeline re-runs (normalization → matching → stats → cache).
- Alias manager UI for fixing entity-resolution misses.
- Export any table/stat view as CSV.

---

## 4. Recommended Tech Stack

Optimized for a solo builder using Claude Code, minimal ops, local-first:

- **Framework**: Next.js 14+ (App Router) with TypeScript — single codebase for UI + API routes.
- **Database**: SQLite via Drizzle ORM (file-based, zero ops, trivially fast at this scale — ~4,000 total rows). DuckDB is an alternative if heavier analytics emerge, but SQLite is sufficient.
- **Data pipeline**: TypeScript scripts (`/scripts/ingest.ts`) using PapaParse for CSV parsing and `fuzzball` (or similar) for fuzzy name matching. Run via `npm run ingest`.
- **Charts**: Recharts (declarative, plays well with a JSON chart-spec approach).
- **Map**: Leaflet + OpenStreetMap tiles (free, no API key) — Mapbox only if aesthetics matter.
- **AI**: Anthropic API (Claude Sonnet) for: chart-spec generation, review summarization/sentiment (batch, cached to DB), and Reddit reply drafting. All AI calls run server-side; API key in `.env`.
- **Styling**: Tailwind + shadcn/ui.
- **Deployment**: run locally (`npm run dev`) or deploy to Vercel/Fly if team access is needed. If deployed, add a single shared-password gate.

### Why not heavier options
No Postgres, no Redis, no queue system — dataset is tiny and single-user. Pre-computation is just "run a script and write JSON/tables to SQLite."

---

## 5. Suggested Data Model (SQLite)

- `properties` (id, canonical_name, address, lat, lng, zone, distance_to_campus_mi, is_core, amenities JSON)
- `aliases` (alias_text, property_id)
- `listings` (id, property_id, beds, baths, sqft, price, price_basis, source, listed_date)
- `student_reports` (id, property_id, rent_reported, rent_per_person, beds, review_text, sentiment, complaint_tags JSON, report_date, outlier_flag)
- `stats_cache` (property_id, bed_count, metric_name, value, n, computed_at)
- `saved_charts` (id, title, chart_spec JSON, created_at)

---

## 6. Build Plan (phases for Claude Code)

1. **Phase 1 — Ingestion & entity resolution**: parse three CSVs, normalize names, fuzzy match, emit unmatched report, load SQLite. Deliverable: `npm run ingest` + a match-review report.
2. **Phase 2 — Stats layer**: compute and cache all Section 3.2 statistics. Deliverable: stats populated, verifiable via a debug JSON endpoint.
3. **Phase 3 — Core UI**: search, property profiles, compare, market dashboard.
4. **Phase 4 — AI features**: chart hub (chart-spec approach), review summarization batch job, Reddit composer.
5. **Phase 5 — Polish**: map view, boards/pinning, CSV export, alias manager.

Instruct Claude Code to keep phases independently shippable and to write a small test suite for the ingestion/matching logic (that's where silent bugs are most damaging).

---

## 7. Open Questions (answer these to tighten the spec)

1. **Price basis**: In both the listings and student sheets, are prices per-unit or per-person/per-bed? Student housing near UT is usually leased by the bed — the tool needs one canonical basis. What columns exist to tell them apart?
2. **Exact column schemas**: Please paste the header row of each of the three files. This removes all guesswork from Phase 1.
3. **Dates**: Do listings and student responses have dates? How stale is the oldest data, and should old data be down-weighted or excluded?
4. **Lease term nuance**: Do listings distinguish 12-month vs academic-year leases, or fall vs immediate move-in? These skew prices heavily.
5. **Amenities format**: Are amenities one column of free text, or structured columns (pool: Y/N, etc.)?
6. **Users**: Just you, or a small team? Does it need to be deployed/shared, or is localhost fine?
7. **Reddit workflow**: Do you want the tool to only *draft* replies (human posts manually), or eventually integrate with Reddit's API? (Recommend draft-only — safer and simpler.)
8. **Review privacy**: Do student responses contain names or identifying info that should be scrubbed before display or AI processing?
9. **Long-tail properties**: Should non-core properties get full profile pages, or just a minimal stats card?
10. **Update cadence**: Will you re-scrape listings periodically? If so, keeping historical snapshots enables price-over-time charts — worth deciding now.


A note for claude: you're end goal should be to essentially allow the user to become the worlds most insnae realestate agent giving them quick knowledge to answer any persons questions or any clients this should be the best tool for realestate agents who know what they're doing to use in order to easily help their client find their best home (eseentially just what these reddit questions would likely ask anyways)
