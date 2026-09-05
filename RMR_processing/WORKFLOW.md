# RMR Weekly Processing Workflow

Runbook for Claude CLI. Run weekly after new data is pasted into
`../data/Raw_data.json`.

**Invocation:** `cd ~/RMR_InternalTool/RMR_processing && claude "Follow WORKFLOW.md"`

**End product:** `apartments.json` — per-building price-transparency data the
website reads directly (levels.fyi style). Keyed by canonical name from
`properties.csv` (the whitelist — edit that file to add/remove properties;
everything else adapts automatically).

---

## Step 1 — Deterministic processing

```bash
python3 process_raw.py
```

- Auto-repairs the usual missing-brace corruption in Raw_data.json.
- Matches every submission/survey/rating `hood`/`building` against
  `properties.csv`: exact (case/whitespace-insensitive), else edit
  distance ≤ 2. Anything else is dropped.
- Check the printed summary. Expect match rate ≳ 90% of submissions.
  If it craters, the raw file format probably changed — inspect before
  continuing.

Outputs: `submissions_clean.csv`, `apartments.json` (stats, reviews empty),
`review_candidates.json`, `unmatched_report.json`.

## Step 2 — Check unmatched names

Read `unmatched_report.json`. If any single name has **≥ 5 records**, tell the
user at the end of the run — it is likely a real building missing from
`properties.csv` (they decide whether to add it). Low-count noise (greek
houses, co-ops, typo one-offs) can just be summarized.

## Step 3 — LLM step: pick top 3 reviews per building

Read `review_candidates.json`. For **each building**, select up to 3 reviews.

**Selection criteria (in priority order):**
1. **Informative** — specific facts a prospective renter can act on: pricing
   details/concessions, maintenance quality, management behavior, noise,
   amenities condition, move-in experience. Reject vacuous notes ("good",
   "One by one", "n/a"-type).
2. **Representative** — the 3 together should reflect the overall sentiment
   spread, not 3 copies of the same complaint or 3 raves if reviews are mixed.
3. **Recent preferred** — break ties toward newer `date`.

**Text handling:**
- Strip PII: person names, unit/room numbers, phone, email. Replace naturally
  (e.g. "unit 304" → "my unit") — never leave placeholders like [REDACTED].
- Light typo/punctuation cleanup only. Preserve the student's voice. Never
  invent, extend, or soften content.
- Keep each review's metadata unchanged (`source`, `layout`, `rent`,
  `signed`, `date`).

Write `top_reviews.json`:

```json
{
  "<canonical_name>": [
    { "text": "...", "source": "submission", "layout": "2 Bed / 2 Bath",
      "rent": 1200, "signed": "May 2026", "date": "2026-03-01" }
  ]
}
```

Buildings with fewer than 3 usable notes: include what exists (1–2 is fine).
Buildings with zero usable notes: omit the key entirely.

## Step 3b — LLM step: "students frequently say" general notes

Still working from `review_candidates.json`, synthesize per-building bullet
points for the website's "students frequently say" section. Unlike top
reviews, this uses **ALL** notes — vacuous one-liners count toward themes
("Close to campus" ×10 IS a notable theme in aggregate).

**Rules:**
- A bullet = one notable consolidated claim + mention count:
  `"Elevators frequently broken (20+ mentions)"`. Count = number of distinct
  notes touching the theme; use `N+` when approximate.
- Notable means a prospective renter would care: recurring complaints,
  standout amenities, fee patterns, location consensus, maintenance
  reputation, specific incidents echoed by several people. Both good and bad.
- Target 5 bullets. Fewer is fine — never pad with filler. More than 5
  allowed when a building genuinely has more notable themes.
- Single-mention items qualify only if highly consequential (e.g. mold
  displacement, building fire) — then say "(1 report)".
- Incidents that appear temporary/resolved (a fire, a water outage that notes
  say was fixed, an elevator crisis that ended) get a `"Previous issue: ..."`
  prefix — if it seems temporary, it probably was. Ongoing patterns
  (elevators break every month, chronic roaches) stay unprefixed.
- Deaths or suicides connected to a building: never publish, even if true.
- Tag each bullet's sentiment: `positive` | `negative` | `neutral`.
- Same PII rules as reviews. No names, no unit numbers.
- Buildings with nothing notable: omit the key.

Write `general_notes.json`:

```json
{
  "<canonical_name>": [
    { "text": "Elevators frequently broken (20+ mentions)", "sentiment": "negative" },
    { "text": "Maintenance responds fast (8 mentions)", "sentiment": "positive" }
  ]
}
```

## Step 4 — Merge + validate

```bash
python3 merge_reviews.py
```

Merges `top_reviews.json` (required) and `general_notes.json` (optional).
Hard-fails on schema problems, bad sentiment values, or leftover PII
(emails/phones/unit numbers). Fix the offending file and rerun until clean.

## Step 5 — Sanity checks

1. `python3 -m json.tool apartments.json > /dev/null` — valid JSON.
2. Building count in apartments.json == row count of properties.csv.
3. Spot-check one building: grep its rows in `submissions_clean.csv`,
   recompute one layout's average rent by hand, compare to apartments.json.
4. Confirm a known zero-data whitelist building appears with
   `"sample_count": 0`.
5. Parking rule: `avg_cost` must ignore zeros (0 ≠ free). If a building has
   only 0-cost parking rows, `avg_cost` is `null` and `priced_count` 0.

## Step 6 — Report to user

Short summary: submissions matched/dropped, buildings with data, buildings
that got reviews, any ≥5-count unmatched names worth adding to
properties.csv, anything anomalous.

## Step 7 — Upload to Algolia

Pushes `apartments.json` into the Algolia index `RMR_packagedata`. Each
whitelist building becomes one record (`objectID` = canonical name) so
repeat runs upsert instead of duplicating.

```bash
python3 upload_to_algolia.py --dry-run  # validate records locally, no API calls
python3 upload_to_algolia.py            # clear index, then replace contents
python3 upload_to_algolia.py --no-clear # upsert only, keep existing records
```

Credentials (do not invent values; set these in the environment or a
local untracked `.env` — never commit keys):

| Variable            | Required | Purpose                                      |
| ------------------- | -------- | -------------------------------------------- |
| `ALGOLIA_APP_ID`    | yes      | Algolia application ID                       |
| `ALGOLIA_WRITE_KEY` | yes      | Algolia **admin/write** API key (not search) |

`upload_to_algolia.py` currently falls back to in-repo defaults if the
env vars are unset. Prefer exporting the env vars (see `.env.example`)
so keys are not relied on from source. A search-only key will fail the
clear/batch write calls. The in-repo default write key returned HTTP 403
("Invalid Application-ID or API key") when this pipeline was run on
2026-09-05 — a live `ALGOLIA_WRITE_KEY` must be provided to finish the
upload.

---

## Data notes (for whoever runs this)

- `Raw_data.json` is an app-state export; only `submissions`, `surveys`,
  `ratings` are populated. It routinely arrives missing its final `}` —
  `process_raw.py` handles that.
- `parkingCost: 0` / `utilityCost: 0` mean *unreported*, not free.
- `doubleOccupancy: true` rents are per-person shared-room prices — kept in a
  separate `double_occupancy` block per layout, never mixed into the main
  averages.
- `signingYear` values "Current Lease"/"Current Year" normalize to the
  current calendar year.
- `effective_avg_cost` per layout = avg rent + building-wide avg reported
  utility cost (rough true-cost figure for comparisons).

## Future ideas (not built)

- Listed-vs-reported rent delta using FML_scraper `master.json`.
- Per-bed price normalization across layouts.
- "Your rent beats N% of reported leases" percentile endpoint.
