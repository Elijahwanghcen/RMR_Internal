#!/usr/bin/env python3
"""
json_to_csv.py
--------------
Scans a JSON file for "submission"-type records and writes them to a CSV.

A submission record is identified by having ALL of these fields:
  _timestamp, createdAt, hood, id, rent, layout, parking, utils

Usage:
  python3 json_to_csv.py <input.json> [output.csv]

If output.csv is omitted, it defaults to submissions_output.csv
"""

import json
import csv
import sys
import os
from datetime import datetime

# ── Canonical columns (in order) ────────────────────────────────────────────
COLUMNS = [
    "_timestamp",
    "_user.displayName",
    "_user.handle",
    "_user.id",
    "_user.profileImageUrl",
    "createdAt",
    "doubleOccupancy",
    "hood",
    "id",
    "isOwnPlace",
    "layout",
    "note",
    "parking",
    "parkingCost",
    "rent",
    "signingMonth",
    "signingYear",
    "utilityCost",
    "utils",
]

# Fields that must be present for a record to be considered a submission
REQUIRED_FIELDS = {"_timestamp", "createdAt", "hood", "id", "rent", "layout", "parking", "utils"}

# Year values that should be normalised to 2025
YEAR_ALIASES = {"current year", "current lease"}


def normalise_year(val):
    """Replace vague year strings with 2025."""
    if isinstance(val, str) and val.strip().lower() in YEAR_ALIASES:
        return "2025"
    return val


def flatten_record(record: dict) -> dict:
    """
    Flatten a submission record into a single-level dict matching COLUMNS.
    Handles:
      - Nested _user object → dot-notation keys
      - Missing fields → empty string
      - Null values → empty string
      - Boolean → TRUE / FALSE
      - 'Current Year' / 'Current Lease' → 2025
    """
    row = {}

    # _user sub-object
    user = record.get("_user") or {}
    row["_user.displayName"]   = user.get("displayName") or ""
    row["_user.handle"]        = user.get("handle") or ""
    row["_user.id"]            = user.get("id") or ""
    row["_user.profileImageUrl"] = user.get("profileImageUrl") or ""

    for col in COLUMNS:
        if col.startswith("_user."):
            continue  # already handled above
        val = record.get(col)
        if val is None:
            row[col] = ""
        elif isinstance(val, bool):
            row[col] = "TRUE" if val else "FALSE"
        else:
            row[col] = normalise_year(str(val))

    return row


def is_submission(record) -> bool:
    """Return True if a dict looks like a submission record."""
    if not isinstance(record, dict):
        return False
    return REQUIRED_FIELDS.issubset(record.keys())


def collect_submissions(data) -> list:
    """
    Recursively walk the parsed JSON and collect every submission record.
    Works whether the submissions are in a top-level array, a named key,
    or nested inside other structures.
    """
    found = []

    if isinstance(data, list):
        for item in data:
            if is_submission(item):
                found.append(item)
            else:
                found.extend(collect_submissions(item))
    elif isinstance(data, dict):
        if is_submission(data):
            found.append(data)
        else:
            for val in data.values():
                found.extend(collect_submissions(val))

    return found


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) >= 3 else "submissions_output.csv"

    if not os.path.exists(input_path):
        print(f"ERROR: File not found: {input_path}")
        sys.exit(1)

    print(f"Reading: {input_path}")
    with open(input_path, "r", encoding="utf-8") as f:
        raw = f.read()

    # Try parsing as-is first; if that fails, apply fixups for common export
    # quirks (e.g. a bare ``[], "submissions": [...]`` fragment that isn't
    # wrapped in outer braces).
    data = None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        cleaned = raw.strip()
        # Strip a leading bare array + comma (e.g. ``[],``)
        while cleaned.startswith("[],"):
            cleaned = cleaned[3:].lstrip()
        # Wrap bare key-value fragments in { } so they become a valid object
        if cleaned.startswith('"'):
            cleaned = "{" + cleaned + "}"
        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError as e:
            print(f"ERROR: Invalid JSON — {e}")
            sys.exit(1)

    submissions = collect_submissions(data)

    if not submissions:
        print("No submission-type records found in the file.")
        sys.exit(0)

    print(f"Found {len(submissions)} submission records.")

    rows = [flatten_record(r) for r in submissions]

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)

    print(f"CSV written to: {output_path}")
    print(f"Columns: {len(COLUMNS)}")
    print(f"Rows:    {len(rows)}")


if __name__ == "__main__":
    main()
