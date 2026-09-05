#!/usr/bin/env python3
"""
process_raw.py
--------------
Deterministic (no-LLM) stage of the RMR weekly pipeline.

Reads:
  ../data/Raw_data.json   (auto-repairs a missing final brace)
  ./properties.csv        (whitelist: canonical_name,website_url — THE source
                           of truth for which apartments to include)

Writes (all into this folder):
  submissions_clean.csv    flat CSV of whitelist-matched submissions
  apartments.json          per-building stats keyed by canonical name
                           (top_reviews left empty — filled by merge_reviews.py)
  review_candidates.json   all notes per building, for the LLM selection step
  unmatched_report.json    hood/building names that matched nothing (ignored)

Matching rules (per project decision):
  1. exact match after lowercase + whitespace collapse
  2. else Levenshtein distance <= 2 ("a couple characters off")
  3. else the record is DROPPED and logged to unmatched_report.json

Usage:
  python3 process_raw.py [path/to/Raw_data.json]
"""

import csv
import json
import os
import re
import statistics
import sys
from collections import Counter, defaultdict
from datetime import date, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_RAW = os.path.join(HERE, "..", "data", "Raw_data.json")
PROPERTIES_CSV = os.path.join(HERE, "properties.csv")

OUT_CSV = os.path.join(HERE, "submissions_clean.csv")
OUT_APARTMENTS = os.path.join(HERE, "apartments.json")
OUT_CANDIDATES = os.path.join(HERE, "review_candidates.json")
OUT_UNMATCHED = os.path.join(HERE, "unmatched_report.json")

CSV_COLUMNS = [
    "canonical_name", "hood_as_typed", "layout", "rent", "doubleOccupancy",
    "parking", "parkingCost", "utils", "utilityCost", "isOwnPlace",
    "signingMonth", "signingYear", "note", "createdAt", "created_date", "id",
]

CURRENT_YEAR = str(date.today().year)
YEAR_ALIASES = {"current year", "current lease"}


# ── JSON load with auto-repair ──────────────────────────────────────────────

def load_raw(path):
    with open(path, "r", encoding="utf-8") as f:
        raw = f.read()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    # Common export quirks: missing closing brace(s), bare fragment.
    cleaned = raw.strip()
    while cleaned.startswith("[],"):
        cleaned = cleaned[3:].lstrip()
    if cleaned.startswith('"'):
        cleaned = "{" + cleaned + "}"
    opens, closes = cleaned.count("{"), cleaned.count("}")
    if opens > closes:
        cleaned = cleaned + "}" * (opens - closes)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        sys.exit(f"ERROR: Raw_data.json unparseable even after repair — {e}")


# ── Whitelist matching ──────────────────────────────────────────────────────

def norm(s):
    return " ".join(str(s).lower().split())


def levenshtein(a, b, cap=3):
    """Edit distance with early exit once distance must exceed cap."""
    if abs(len(a) - len(b)) > cap:
        return cap + 1
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        best = i
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
            best = min(best, cur[j])
        if best > cap:
            return cap + 1
        prev = cur
    return prev[-1]


class Matcher:
    def __init__(self, whitelist):
        # whitelist: list of (canonical_name, website_url)
        self.exact = {norm(name): name for name, _ in whitelist}
        self.cache = {}

    def match(self, raw_name):
        n = norm(raw_name)
        if not n:
            return None
        if n in self.cache:
            return self.cache[n]
        result = self.exact.get(n)
        if result is None:
            # strict fuzzy: distance <= 2, unique best match
            best, best_d = None, 3
            tied = False
            for key, canon in self.exact.items():
                d = levenshtein(n, key, cap=2)
                if d < best_d:
                    best, best_d, tied = canon, d, False
                elif d == best_d and best is not None:
                    tied = True
            if best is not None and best_d <= 2 and not tied:
                result = best
        self.cache[n] = result
        return result


# ── Field normalizers ───────────────────────────────────────────────────────

# Tolerates: missing slash, "Beds"/"Baths", trailing typos ("Bathv"),
# missing space ("5Bed"). Anchored at start so prefixed variants like
# "Shared 2 Bed 2 Bath (...)" stay distinct layouts.
LAYOUT_RE = re.compile(r"^(\d+)\s*bed(?:s)?\s*/?\s*(\d+)\s*bath\w*\s*$", re.I)
# "Bed 3 / Bed 3" style (second "Bed" is a typo for Bath)
LAYOUT_ALT_RE = re.compile(r"^bed\s*(\d+)\s*/\s*(?:bed|bath)\s*(\d+)\s*$", re.I)


def norm_layout(val):
    if not val or not str(val).strip():
        return "Unknown"
    s = " ".join(str(val).split())
    m = LAYOUT_RE.match(s) or LAYOUT_ALT_RE.match(s)
    if m:
        return f"{m.group(1)} Bed / {m.group(2)} Bath"
    if s.strip().lower() == "studio":
        return "Studio"
    return s.title()


def norm_year(val):
    if val is None:
        return ""
    s = str(val).strip()
    if s.lower() in YEAR_ALIASES:
        return CURRENT_YEAR
    return s


def to_number(val):
    """Coerce to int/float; return None if impossible."""
    if isinstance(val, bool):
        return None
    if isinstance(val, (int, float)):
        return val
    if isinstance(val, str):
        s = re.sub(r"[^\d.]", "", val)
        if s:
            try:
                return float(s) if "." in s else int(s)
            except ValueError:
                return None
    return None


def created_date(ms):
    try:
        return datetime.fromtimestamp(ms / 1000).strftime("%Y-%m-%d")
    except (TypeError, ValueError, OSError):
        return ""


def rnd(x, digits=0):
    if x is None:
        return None
    r = round(x, digits)
    return int(r) if digits == 0 else r


# ── Stats builders ──────────────────────────────────────────────────────────

def rent_stats(rents):
    return {
        "count": len(rents),
        "avg_rent": rnd(statistics.mean(rents)),
        "median_rent": rnd(statistics.median(rents)),
        "min_rent": rnd(min(rents)),
        "max_rent": rnd(max(rents)),
    }


def build_apartment(canon, url, subs, surveys, ratings, today):
    """subs/surveys/ratings: matched records for this building."""
    entry = {
        "canonical_name": canon,
        "website_url": url,
        "sample_count": len(subs),
        "layouts": {},
        "parking": None,
        "utilities": None,
        "rating": None,
        "survey": None,
        "lease_years": {},
        "top_reviews": [],
        "general_notes": [],
        "last_updated": today,
    }

    # layouts: single vs double occupancy split
    by_layout = defaultdict(lambda: {"single": [], "double": []})
    for s in subs:
        rent = to_number(s.get("rent"))
        if rent is None or rent <= 0:
            continue
        bucket = "double" if s.get("doubleOccupancy") is True else "single"
        by_layout[norm_layout(s.get("layout"))][bucket].append(rent)
    for layout in sorted(by_layout):
        singles, doubles = by_layout[layout]["single"], by_layout[layout]["double"]
        stats = rent_stats(singles) if singles else {"count": 0}
        if doubles:
            stats["double_occupancy"] = rent_stats(doubles)
        entry["layouts"][layout] = stats

    # parking: avg over reported prices > 0 only (0 does NOT mean free)
    priced = [to_number(s.get("parkingCost")) for s in subs]
    priced = [p for p in priced if p and p > 0]
    has_parking = sum(1 for s in subs if s.get("parking") is True)
    entry["parking"] = {
        "avg_cost": rnd(statistics.mean(priced)) if priced else None,
        "priced_count": len(priced),
        "has_parking_count": has_parking,
        "note": "avg over reported prices > 0 only; 0/absent is unknown, not free",
    }

    # utilities: utils flag = included in rent; cost avg over reported > 0
    ucosts = [to_number(s.get("utilityCost")) for s in subs]
    ucosts = [u for u in ucosts if u and u > 0]
    entry["utilities"] = {
        "avg_cost": rnd(statistics.mean(ucosts)) if ucosts else None,
        "priced_count": len(ucosts),
        "included_count": sum(1 for s in subs if s.get("utils") is True),
    }

    # effective cost per layout = avg rent + building avg utility cost
    util_avg = entry["utilities"]["avg_cost"] or 0
    for stats in entry["layouts"].values():
        if stats.get("avg_rent") is not None:
            stats["effective_avg_cost"] = stats["avg_rent"] + util_avg

    # star ratings
    stars = [to_number(r.get("rating")) for r in ratings]
    stars = [x for x in stars if x is not None]
    if stars:
        entry["rating"] = {"avg": rnd(statistics.mean(stars), 1), "count": len(stars)}

    # surveys
    if surveys:
        maint = [to_number(s.get("maintenanceRating")) for s in surveys]
        maint = [x for x in maint if x is not None]
        uptime = [to_number(s.get("elevatorUptime")) for s in surveys]
        uptime = [x for x in uptime if x is not None]
        elev = [to_number(s.get("elevatorCount")) for s in surveys]
        elev = [x for x in elev if x is not None]
        complaints = Counter()
        for s in surveys:
            complaints.update(c for c in (s.get("complaints") or []) if c)
            other = (s.get("complaintOther") or "").strip()
            if other:
                complaints[other] += 1
        quality = Counter(s.get("quality") for s in surveys if s.get("quality"))
        entry["survey"] = {
            "count": len(surveys),
            "avg_maintenance_rating": rnd(statistics.mean(maint), 1) if maint else None,
            "avg_elevator_uptime": rnd(statistics.mean(uptime), 1) if uptime else None,
            "elevator_count": rnd(statistics.mean(elev)) if elev else None,
            "quality_mode": quality.most_common(1)[0][0] if quality else None,
            "top_complaints": [c for c, _ in complaints.most_common(5)],
        }

    # lease-year distribution (freshness signal)
    years = Counter(norm_year(s.get("signingYear")) for s in subs)
    years.pop("", None)
    entry["lease_years"] = dict(sorted(years.items(), reverse=True))

    return entry


# ── Main ────────────────────────────────────────────────────────────────────

def main():
    raw_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_RAW
    data = load_raw(raw_path)

    with open(PROPERTIES_CSV, newline="", encoding="utf-8") as f:
        whitelist = [(r["canonical_name"].strip(), (r.get("website_url") or "").strip())
                     for r in csv.DictReader(f) if r.get("canonical_name", "").strip()]
    matcher = Matcher(whitelist)

    submissions = data.get("submissions") or []
    surveys = data.get("surveys") or []
    ratings = data.get("ratings") or []

    matched_subs = defaultdict(list)
    matched_surveys = defaultdict(list)
    matched_ratings = defaultdict(list)
    unmatched = Counter()

    for s in submissions:
        canon = matcher.match(s.get("hood") or "")
        if canon:
            matched_subs[canon].append(s)
        else:
            unmatched[(s.get("hood") or "").strip() or "(blank)"] += 1
    for s in surveys:
        canon = matcher.match(s.get("building") or "")
        if canon:
            matched_surveys[canon].append(s)
        else:
            unmatched[(s.get("building") or "").strip() or "(blank)"] += 1
    for r in ratings:
        canon = matcher.match(r.get("building") or "")
        if canon:
            matched_ratings[canon].append(r)
        else:
            unmatched[(r.get("building") or "").strip() or "(blank)"] += 1

    today = date.today().isoformat()

    # ── submissions_clean.csv ──
    rows = []
    for canon, subs in matched_subs.items():
        for s in subs:
            rows.append({
                "canonical_name": canon,
                "hood_as_typed": s.get("hood") or "",
                "layout": norm_layout(s.get("layout")),
                "rent": to_number(s.get("rent")) or "",
                "doubleOccupancy": "TRUE" if s.get("doubleOccupancy") is True else "FALSE",
                "parking": "TRUE" if s.get("parking") is True else "FALSE",
                "parkingCost": to_number(s.get("parkingCost")) or 0,
                "utils": "TRUE" if s.get("utils") is True else "FALSE",
                "utilityCost": to_number(s.get("utilityCost")) or 0,
                "isOwnPlace": "TRUE" if s.get("isOwnPlace") is True else "FALSE",
                "signingMonth": s.get("signingMonth") or "",
                "signingYear": norm_year(s.get("signingYear")),
                "note": (s.get("note") or "").strip(),
                "createdAt": s.get("createdAt") or "",
                "created_date": created_date(s.get("createdAt")),
                "id": s.get("id") or "",
            })
    rows.sort(key=lambda r: (r["canonical_name"], str(r["createdAt"])))
    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
        w.writeheader()
        w.writerows(rows)

    # ── apartments.json (whole whitelist; zero-data buildings included) ──
    apartments = {}
    for canon, url in whitelist:
        apartments[canon] = build_apartment(
            canon, url,
            matched_subs.get(canon, []),
            matched_surveys.get(canon, []),
            matched_ratings.get(canon, []),
            today,
        )
    with open(OUT_APARTMENTS, "w", encoding="utf-8") as f:
        json.dump(apartments, f, indent=2, ensure_ascii=False)

    # ── review_candidates.json (for the LLM top-3 selection step) ──
    candidates = {}
    for canon, _ in whitelist:
        notes = []
        for s in matched_subs.get(canon, []):
            txt = (s.get("note") or "").strip()
            if txt:
                notes.append({
                    "text": txt,
                    "source": "submission",
                    "layout": norm_layout(s.get("layout")),
                    "rent": to_number(s.get("rent")),
                    "signed": " ".join(x for x in [s.get("signingMonth") or "",
                                                   norm_year(s.get("signingYear"))] if x),
                    "date": created_date(s.get("createdAt")),
                })
        for s in matched_surveys.get(canon, []):
            for field, label in (("maintenanceNote", "survey_maintenance"),
                                 ("extraNotes", "survey_extra")):
                txt = (s.get(field) or "").strip()
                if txt:
                    notes.append({
                        "text": txt,
                        "source": label,
                        "layout": None,
                        "rent": None,
                        "signed": "",
                        "date": created_date(s.get("createdAt")),
                    })
        if notes:
            notes.sort(key=lambda n: n["date"], reverse=True)
            candidates[canon] = notes
    with open(OUT_CANDIDATES, "w", encoding="utf-8") as f:
        json.dump(candidates, f, indent=2, ensure_ascii=False)

    # ── unmatched_report.json ──
    report = {
        "generated": today,
        "note": "Names below matched nothing in properties.csv and were IGNORED. "
                "Add a row to properties.csv (exact spelling) to start tracking one.",
        "unmatched": dict(unmatched.most_common()),
        "total_records_dropped": sum(unmatched.values()),
    }
    with open(OUT_UNMATCHED, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    # ── summary ──
    with_data = sum(1 for a in apartments.values() if a["sample_count"] > 0)
    print(f"Raw file:              {raw_path}")
    print(f"Whitelist properties:  {len(whitelist)}")
    print(f"Submissions matched:   {len(rows)} / {len(submissions)}")
    print(f"Surveys matched:       {sum(len(v) for v in matched_surveys.values())} / {len(surveys)}")
    print(f"Ratings matched:       {sum(len(v) for v in matched_ratings.values())} / {len(ratings)}")
    print(f"Buildings with data:   {with_data} / {len(whitelist)}")
    print(f"Buildings with notes:  {len(candidates)}")
    print(f"Records dropped:       {report['total_records_dropped']} (see unmatched_report.json)")
    print("Wrote: submissions_clean.csv, apartments.json, review_candidates.json, unmatched_report.json")


if __name__ == "__main__":
    main()
