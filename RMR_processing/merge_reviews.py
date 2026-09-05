#!/usr/bin/env python3
"""
merge_reviews.py
----------------
Validates the LLM-step outputs and merges them into apartments.json.
Run AFTER process_raw.py and the LLM selection/synthesis.

Inputs:
  top_reviews.json    (required)  — top 3 reviews per building
  general_notes.json  (optional)  — "students frequently say" bullets

top_reviews.json schema:
{
  "<canonical_name>": [
    { "text": "...", "source": "submission|survey_maintenance|survey_extra",
      "layout": "2 Bed / 2 Bath" | null, "rent": 1200 | null,
      "signed": "May 2026" | "", "date": "YYYY-MM-DD" },
    ... up to 3 per building
  ]
}

general_notes.json schema:
{
  "<canonical_name>": [
    { "text": "Elevators frequently broken (20+ mentions)",
      "sentiment": "positive" | "negative" | "neutral" },
    ...  target 5 bullets; fewer is fine, more allowed if warranted
  ]
}

Validation (both files):
  - every building key must exist in apartments.json (i.e. on the whitelist)
  - text non-empty; reviews max 3 per building; notes need valid sentiment
  - PII scan: emails, phone numbers, unit numbers ("unit 304", "apt 12B")
    -> hard fail so nothing leaks to the site

Usage:
  python3 merge_reviews.py
"""

import json
import os
import re
import sys
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
APARTMENTS = os.path.join(HERE, "apartments.json")
TOP_REVIEWS = os.path.join(HERE, "top_reviews.json")
GENERAL_NOTES = os.path.join(HERE, "general_notes.json")

VALID_SOURCES = {"submission", "survey_maintenance", "survey_extra"}
VALID_SENTIMENTS = {"positive", "negative", "neutral"}

PII_PATTERNS = [
    (re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+"), "email address"),
    (re.compile(r"\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b"), "phone number"),
    (re.compile(r"\b(unit|apt|apartment|room)\s*#?\s*\d+[a-z]?\b", re.I), "unit/room number"),
]


def main():
    for path in (APARTMENTS, TOP_REVIEWS):
        if not os.path.exists(path):
            sys.exit(f"ERROR: missing {os.path.basename(path)} — run the earlier steps first.")

    with open(APARTMENTS, encoding="utf-8") as f:
        apartments = json.load(f)
    with open(TOP_REVIEWS, encoding="utf-8") as f:
        reviews = json.load(f)
    notes = {}
    if os.path.exists(GENERAL_NOTES):
        with open(GENERAL_NOTES, encoding="utf-8") as f:
            notes = json.load(f)
    else:
        print("WARNING: general_notes.json not found — merging reviews only.")

    errors = []
    for building, revs in reviews.items():
        if building not in apartments:
            errors.append(f"'{building}': not in apartments.json / whitelist")
            continue
        if not isinstance(revs, list):
            errors.append(f"'{building}': value must be a list")
            continue
        if len(revs) > 3:
            errors.append(f"'{building}': {len(revs)} reviews (max 3)")
        for i, r in enumerate(revs):
            if not isinstance(r, dict) or not (r.get("text") or "").strip():
                errors.append(f"'{building}'[{i}]: empty or missing text")
                continue
            if r.get("source") not in VALID_SOURCES:
                errors.append(f"'{building}'[{i}]: bad source '{r.get('source')}'")
            for pat, label in PII_PATTERNS:
                m = pat.search(r["text"])
                if m:
                    errors.append(f"'{building}'[{i}]: possible {label} in text: '{m.group(0)}'")

    for building, bullets in notes.items():
        if building not in apartments:
            errors.append(f"notes '{building}': not in apartments.json / whitelist")
            continue
        if not isinstance(bullets, list):
            errors.append(f"notes '{building}': value must be a list")
            continue
        for i, b in enumerate(bullets):
            if not isinstance(b, dict) or not (b.get("text") or "").strip():
                errors.append(f"notes '{building}'[{i}]: empty or missing text")
                continue
            if b.get("sentiment") not in VALID_SENTIMENTS:
                errors.append(f"notes '{building}'[{i}]: bad sentiment '{b.get('sentiment')}'")
            for pat, label in PII_PATTERNS:
                m = pat.search(b["text"])
                if m:
                    errors.append(f"notes '{building}'[{i}]: possible {label} in text: '{m.group(0)}'")

    if errors:
        print("VALIDATION FAILED — nothing merged:")
        for e in errors:
            print("  -", e)
        sys.exit(1)

    today = date.today().isoformat()
    merged = 0
    for building, revs in reviews.items():
        apartments[building]["top_reviews"] = revs[:3]
        apartments[building]["last_updated"] = today
        merged += 1
    notes_merged = 0
    for building, bullets in notes.items():
        apartments[building]["general_notes"] = bullets
        apartments[building]["last_updated"] = today
        notes_merged += 1

    with open(APARTMENTS, "w", encoding="utf-8") as f:
        json.dump(apartments, f, indent=2, ensure_ascii=False)

    total_with_data = sum(1 for a in apartments.values() if a["sample_count"] > 0)
    print(f"Merged top reviews for {merged} buildings into apartments.json")
    print(f"Merged general notes for {notes_merged} buildings")
    print(f"Buildings with data: {total_with_data} / {len(apartments)}")


if __name__ == "__main__":
    main()
